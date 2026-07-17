// Requests are routed through our own API server (same-origin), which proxies
// to the upstream Alemancenter backend and injects the X-Frontend-Key secret
// server-side. This avoids the browser CORS restriction (upstream only
// allows the https://alemancenter.com origin) and keeps the frontend key out
// of client-side JS.
const API_BASE = "/api";

// ─── Token storage ────────────────────────────────────────────────────────────
// The access token lives in memory only — never written to localStorage or
// sessionStorage — so injected scripts cannot steal it via storage APIs.
// The refresh token is stored exclusively in an httpOnly cookie managed by the
// API server (/api/auth/refresh), which means browser JS has zero access to it.

let _accessToken: string | null = null;

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setTokens(accessToken: string, _refreshToken?: string | null) {
  _accessToken = accessToken;
  // Refresh token is intentionally ignored: it is managed server-side via
  // an httpOnly cookie set by the /api/auth/login|register|refresh routes.
}

export function clearTokens() {
  _accessToken = null;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  isForm?: boolean;
  skipAuth?: boolean;
  raw?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        // No body required — the server reads the refresh token from the
        // httpOnly cookie that was set at login/register time.
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) return false;
        const json = await res.json();
        const data = json.data ?? json;
        const accessToken = data.access_token ?? data.token;
        if (!accessToken) return false;
        setTokens(accessToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, isForm, skipAuth, raw, headers, ...rest } = options;

  const doFetch = async (): Promise<Response> => {
    const finalHeaders: Record<string, string> = {
      ...(headers as Record<string, string>),
    };

    if (!isForm && body !== undefined) {
      finalHeaders["Content-Type"] = "application/json";
    }

    if (!skipAuth) {
      const token = getAccessToken();
      if (token) {
        finalHeaders["Authorization"] = `Bearer ${token}`;
      }
    }

    return fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: isForm ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let res = await doFetch();

  // On 401, attempt a silent token refresh via the httpOnly-cookie endpoint,
  // then retry the original request once.
  if (res.status === 401 && !skipAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      res = await doFetch();
    }
  }

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message =
      (payload && (payload.message || payload.error)) ||
      res.statusText ||
      "حدث خطأ غير متوقع";
    throw new ApiError(res.status, message, payload);
  }

  if (!isJson) {
    return payload as T;
  }

  if (raw) {
    return payload as T;
  }

  // Backend wraps most responses as { success, message, data }
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data as T;
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

export function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export { API_BASE };
