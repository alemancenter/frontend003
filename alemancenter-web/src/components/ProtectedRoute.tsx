import { useEffect, type ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, hasCheckedAuth, refreshUser } = useAuth();
  useEffect(() => {
    if (!isLoading && !hasCheckedAuth) void refreshUser();
  }, [hasCheckedAuth, isLoading, refreshUser]);
  if (isLoading || !hasCheckedAuth) return null;
  if (!isAuthenticated) return <Redirect to="/login" />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, hasCheckedAuth, refreshUser, canAccessAdmin } = useAuth();
  useEffect(() => {
    if (!isLoading && !hasCheckedAuth) void refreshUser();
  }, [hasCheckedAuth, isLoading, refreshUser]);
  if (isLoading || !hasCheckedAuth) return null;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (!canAccessAdmin) return <Redirect to="/dashboard" />;
  return <>{children}</>;
}

export function RequirePermission({ permission, children }: { permission: string; children: ReactNode }) {
  const { isAuthenticated, isLoading, hasCheckedAuth, refreshUser, hasPermission } = useAuth();
  useEffect(() => {
    if (!isLoading && !hasCheckedAuth) void refreshUser();
  }, [hasCheckedAuth, isLoading, refreshUser]);
  if (isLoading || !hasCheckedAuth) return null;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (!hasPermission(permission)) return <Redirect to="/dashboard" />;
  return <>{children}</>;
}

export function RequireTeacherPortal({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, hasCheckedAuth, refreshUser } = useAuth();
  useEffect(() => {
    if (!isLoading && !hasCheckedAuth) void refreshUser();
  }, [hasCheckedAuth, isLoading, refreshUser]);
  if (isLoading || !hasCheckedAuth) return null;
  if (!isAuthenticated) return <Redirect to="/login?redirect=/teacher" />;
  return <>{children}</>;
}
