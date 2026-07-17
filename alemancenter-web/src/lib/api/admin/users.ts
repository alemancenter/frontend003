import { api, buildQuery } from "../client";
import type { AdminPaginatedResponse } from "./index";
import type { User } from "../types";

export type UserStatus = "active" | "inactive" | "banned";

export interface AdminUserListParams {
  page?: number;
  per_page?: number;
  /** Free-text search over name/email — backend param is `search`. */
  search?: string;
  status?: UserStatus;
  /** Role name to filter by. */
  role?: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  roles?: number[];
}

export interface UpdateUserInput {
  name?: string;
  phone?: string;
  job_title?: string;
  gender?: "male" | "female" | "other";
  country?: string;
  status?: UserStatus;
  /** Optional password reset (min 8 chars). */
  password?: string;
}

// ===== Users management =====
export const adminUsersApi = {
  search: (query: string) => api.get<User[]>(`/dashboard/users/search${buildQuery({ search: query })}`),
  list: (params: AdminUserListParams = {}) =>
    api.get<User[]>(`/dashboard/users${buildQuery(params as Record<string, unknown>)}`),
  listWithMeta: (params: AdminUserListParams = {}) =>
    api.get<AdminPaginatedResponse<User>>(
      `/dashboard/users${buildQuery(params as Record<string, unknown>)}`,
      { raw: true },
    ),
  create: (input: CreateUserInput) => api.post<User>("/dashboard/users", input),
  show: (id: number | string) => api.get<User>(`/dashboard/users/${id}`),
  update: (id: number | string, input: UpdateUserInput) =>
    api.put<User>(`/dashboard/users/${id}`, input),
  delete: (id: number | string) => api.delete<{ message: string }>(`/dashboard/users/${id}`),
  updateRolesPermissions: (id: number | string, input: { roles?: number[]; permissions?: number[] }) =>
    api.put<User>(`/dashboard/users/${id}/roles-permissions`, input),
  bulkDelete: (ids: number[]) => api.post<{ message: string }>("/dashboard/users/bulk-delete", { ids }),
  // Backend endpoint is bulk: it takes an `ids` array + a single status.
  updateStatus: (ids: number[], status: UserStatus) =>
    api.post<{ message: string }>("/dashboard/users/update-status", { ids, status }),
};
