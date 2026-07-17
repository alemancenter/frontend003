import { api } from "../client";
import type { Permission, Role } from "../types";

// ===== Roles & Permissions =====
export const rolesApi = {
  list: () => api.get<Role[]>("/user/roles"),
  get: (id: number | string) => api.get<Role>(`/user/roles/${id}`),
};

export const adminRolesApi = {
  list: () => api.get<Role[]>("/dashboard/roles"),
  create: (input: { name: string; permissions?: number[] }) =>
    api.post<Role>("/dashboard/roles", input),
  get: (id: number | string) => api.get<Role>(`/dashboard/roles/${id}`),
  update: (id: number | string, input: { name?: string; permissions?: number[] }) =>
    api.put<Role>(`/dashboard/roles/${id}`, input),
  delete: (id: number | string) => api.delete<{ message: string }>(`/dashboard/roles/${id}`),

  listPermissions: () => api.get<Permission[]>("/dashboard/permissions"),
  createPermission: (name: string) => api.post<Permission>("/dashboard/permissions", { name }),
  updatePermission: (id: number | string, name: string) =>
    api.put<Permission>(`/dashboard/permissions/${id}`, { name }),
  deletePermission: (id: number | string) =>
    api.delete<{ message: string }>(`/dashboard/permissions/${id}`),
};
