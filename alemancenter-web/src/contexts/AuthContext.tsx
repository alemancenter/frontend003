import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authApi, type LoginInput, type RegisterInput } from "@/lib/api/auth";
import { ApiError, clearTokens, setTokens } from "@/lib/api/client";
import type { AuthTokens, User } from "@/lib/api/types";
import { getFacebookAccessToken, getGoogleIdToken } from "@/lib/social-auth";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  hasCheckedAuth: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  loginWithFacebook: () => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (roleName: string) => boolean;
  hasPermission: (permissionName: string) => boolean;
  canAccessAdmin: boolean;
  canAccessPrivilegedAdmin: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
}

const ADMIN_ROLE_NAMES = ["admin", "super_admin", "super-admin", "super admin", "manager", "administrator", "root"];
const PRIVILEGED_ADMIN_ROLE_NAMES = [
  ...ADMIN_ROLE_NAMES,
  "supervisor",
  "moderator",
  "مشرف",
  "مدير",
  "ادمن",
  "إدمن",
];
const TEACHER_ROLE_NAMES = ["teacher"];
const ADMIN_MANAGEMENT_PERMISSIONS = [
  "manage articles",
  "manage posts",
  "manage categories",
  "manage comments",
  "manage files",
  "manage school classes",
  "manage classes",
  "manage subjects",
  "manage semesters",
  "manage calendar",
  "manage users",
  "manage roles",
  "manage permissions",
  "manage teacher subscriptions",
  "manage messages",
  "manage notifications",
  "manage settings",
  "manage content audit",
  "manage monitoring",
  "manage performance",
  "manage sitemap",
  "manage security",
];

const PERMISSION_ALIASES: Record<string, string[]> = {
  "dashboard.view": ["access dashboard"],
  "access dashboard": ["dashboard.view"],
  "users.view": ["manage users", "admin users"],
  "users.create": ["manage users", "admin users"],
  "users.edit": ["manage users", "admin users"],
  "users.delete": ["manage users", "admin users"],
  "manage users": ["users.view", "users.create", "users.edit", "users.delete", "admin users"],
  "manage teacher subscriptions": ["manage users", "manage roles", "manage settings", "admin users"],
};

function normalizeName(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function getRoleName(role: unknown): string {
  if (typeof role === "string") return role;
  if (role && typeof role === "object" && "name" in role) {
    return String((role as { name?: unknown }).name ?? "");
  }
  return "";
}

function getPermissionName(permission: unknown): string {
  if (typeof permission === "string") return permission;
  if (permission && typeof permission === "object" && "name" in permission) {
    return String((permission as { name?: unknown }).name ?? "");
  }
  return "";
}

function hasAdminRole(user: User | null): boolean {
  if (!user) return false;
  if (user.id === 1) return true;
  return user.roles?.some((role) => ADMIN_ROLE_NAMES.includes(normalizeName(getRoleName(role)))) ?? false;
}

function hasPrivilegedAdminRole(user: User | null): boolean {
  if (!user) return false;
  if (user.id === 1) return true;
  return user.roles?.some((role) => PRIVILEGED_ADMIN_ROLE_NAMES.includes(normalizeName(getRoleName(role)))) ?? false;
}

function permissionMatches(actual: unknown, requested: string): boolean {
  const actualName = normalizeName(getPermissionName(actual));
  if (!actualName) return false;

  const requestedName = normalizeName(requested);
  const aliases = new Set<string>([
    requestedName,
    ...(PERMISSION_ALIASES[requestedName] ?? []).map(normalizeName),
  ]);

  Object.entries(PERMISSION_ALIASES).forEach(([name, mappedAliases]) => {
    if (mappedAliases.map(normalizeName).includes(requestedName)) {
      aliases.add(normalizeName(name));
    }
  });

  return aliases.has(actualName);
}

function hasAnyPermission(user: User | null): boolean {
  if (!user) return false;
  if ((user.permissions?.length ?? 0) > 0) return true;
  return user.roles?.some((role) => (role.permissions?.length ?? 0) > 0) ?? false;
}

function hasUserPermission(user: User | null, permissionName: string): boolean {
  if (!user) return false;

  const hasDirectPermission = user.permissions?.some((perm) => permissionMatches(perm, permissionName)) ?? false;
  if (hasDirectPermission) return true;

  return user.roles?.some((role) =>
    role.permissions?.some((perm) => permissionMatches(perm, permissionName)),
  ) ?? false;
}

function hasAnyManagementPermission(user: User | null): boolean {
  return ADMIN_MANAGEMENT_PERMISSIONS.some((permission) => hasUserPermission(user, permission));
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // A hard reload always loses the in-memory access token, so authentication
  // must be restored before the app announces a logged-out state.
  const [isLoading, setIsLoading] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);

  const refreshUser = useCallback((): Promise<void> => {
    // Provider bootstrap and protected routes may ask for auth at the same
    // time. Reuse one request so refresh-token rotation cannot race itself.
    if (refreshInFlightRef.current) return refreshInFlightRef.current;

    const task = (async () => {
      setIsLoading(true);
      try {
        // The access token is memory-only. /auth/user may initially return 401;
        // the API client then restores an access token through /auth/refresh
        // using the httpOnly refresh cookie and retries this request once.
        const me = await authApi.me();
        setUser(me);
      } catch (error) {
        // Only an actual authentication rejection should destroy local auth
        // state. A temporary network/server failure must not turn a valid
        // session into a logout merely because the page was reloaded.
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          clearTokens();
          setUser(null);
        }
      } finally {
        setHasCheckedAuth(true);
        setIsLoading(false);
      }
    })();

    refreshInFlightRef.current = task;
    task.finally(() => {
      if (refreshInFlightRef.current === task) refreshInFlightRef.current = null;
    });
    return task;
  }, []);

  useEffect(() => {
    // Do not defer this to the first click. Deferring caused public pages to
    // render as logged out after a reload and only restore the session later.
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (input: LoginInput) => {
    const result = await authApi.login(input);
    const accessToken = result.access_token ?? result.token;
    if (!accessToken) {
      throw new Error("لم يتم استلام رمز الدخول من الخادم");
    }
    setTokens(accessToken, result.refresh_token);
    const me = result.user ?? (await authApi.me());
    setUser(me);
    setHasCheckedAuth(true);
    return me;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await authApi.register(input);
    const accessToken = result.access_token ?? result.token;
    if (accessToken) {
      setTokens(accessToken, result.refresh_token);
    }
    const me = result.user ?? (accessToken ? await authApi.me() : null);
    if (me) setUser(me);
    setHasCheckedAuth(true);
    return me as User;
  }, []);

  const applyAuthTokens = useCallback(async (result: AuthTokens) => {
    const accessToken = result.access_token ?? result.token;
    if (!accessToken) {
      throw new Error("لم يتم استلام رمز الدخول من الخادم");
    }
    setTokens(accessToken, result.refresh_token);
    const me = result.user ?? (await authApi.me());
    setUser(me);
    setHasCheckedAuth(true);
    return me;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const idToken = await getGoogleIdToken();
    const result = await authApi.googleTokenLogin(idToken);
    return applyAuthTokens(result);
  }, [applyAuthTokens]);

  const loginWithFacebook = useCallback(async () => {
    const accessToken = await getFacebookAccessToken();
    const result = await authApi.facebookTokenLogin(accessToken);
    return applyAuthTokens(result);
  }, [applyAuthTokens]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout; clear local state regardless.
    } finally {
      clearTokens();
      setUser(null);
      setHasCheckedAuth(true);
    }
  }, []);

  const hasRole = useCallback(
    (roleName: string) =>
      user?.roles?.some((role) => normalizeName(getRoleName(role)) === normalizeName(roleName)) ?? false,
    [user],
  );

  const hasPermission = useCallback(
    (permissionName: string) => {
      if (!user) return false;
      if (hasAdminRole(user)) return true;
      return hasUserPermission(user, permissionName);
    },
    [user],
  );

  const isAdmin = useMemo(() => hasAdminRole(user), [user]);

  const canAccessPrivilegedAdmin = useMemo(
    () => hasPrivilegedAdminRole(user),
    [user],
  );

  const canAccessAdmin = useMemo(
    () => canAccessPrivilegedAdmin || hasAnyPermission(user),
    [canAccessPrivilegedAdmin, user],
  );

  const isTeacher = useMemo(
    () => user?.roles?.some((role) => TEACHER_ROLE_NAMES.includes(normalizeName(getRoleName(role)))) ?? false,
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      hasCheckedAuth,
      isAuthenticated: !!user,
      login,
      register,
      loginWithGoogle,
      loginWithFacebook,
      logout,
      refreshUser,
      hasRole,
      hasPermission,
      canAccessAdmin,
      canAccessPrivilegedAdmin,
      isAdmin,
      isTeacher,
    }),
    [
      user,
      isLoading,
      hasCheckedAuth,
      login,
      register,
      loginWithGoogle,
      loginWithFacebook,
      logout,
      refreshUser,
      hasRole,
      hasPermission,
      canAccessAdmin,
      canAccessPrivilegedAdmin,
      isAdmin,
      isTeacher,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
