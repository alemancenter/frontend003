import { api, buildQuery } from "../client";
import type { Article, Category, Comment, FileItem, Post } from "../types";
import { countryQuery } from "@/lib/country";

function withCountry(params: Record<string, unknown> = {}) {
  return params.country ? { ...params, ...countryQuery(String(params.country)) } : params;
}

// ===== Articles management =====
export interface AdminPaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number;
  to: number;
}

export interface AdminPaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta?: AdminPaginationMeta;
  pagination?: AdminPaginationMeta;
}

export interface ArticleInput {
  title: string;
  content: string;
  grade_level?: string;
  subject_id?: number;
  semester_id?: number;
  meta_description?: string;
  keywords?: string;
}

export const adminArticlesApi = {
  stats: (params: { country?: string } = {}) =>
    api.get<Record<string, unknown>>(`/dashboard/articles/stats${buildQuery(withCountry(params))}`),
  createData: (params: { country?: string } = {}) =>
    api.get<Record<string, unknown>>(`/dashboard/articles/create${buildQuery(withCountry(params))}`),
  list: (params: { page?: number; per_page?: number; status?: number; q?: string; search?: string; country?: string } = {}) =>
    api.get<Article[]>(`/dashboard/articles${buildQuery(withCountry(params))}`),
  listWithMeta: (
    params: { page?: number; per_page?: number; status?: number; q?: string; search?: string; country?: string } = {},
  ) => api.get<AdminPaginatedResponse<Article>>(`/dashboard/articles${buildQuery(withCountry(params))}`, { raw: true }),
  create: (input: ArticleInput, params: { country?: string } = {}) =>
    api.post<Article>(`/dashboard/articles${buildQuery(withCountry(params))}`, input),
  editData: (id: number | string, params: { country?: string } = {}) =>
    api.get<Article>(`/dashboard/articles/${id}/edit${buildQuery(withCountry(params))}`),
  publish: (id: number | string, params: { country?: string } = {}) =>
    api.post<{ message: string }>(`/dashboard/articles/${id}/publish${buildQuery(withCountry(params))}`),
  unpublish: (id: number | string, params: { country?: string } = {}) =>
    api.post<{ message: string }>(`/dashboard/articles/${id}/unpublish${buildQuery(withCountry(params))}`),
  update: (id: number | string, input: Partial<ArticleInput>, params: { country?: string } = {}) =>
    api.put<Article>(`/dashboard/articles/${id}${buildQuery(withCountry(params))}`, input),
  delete: (id: number | string, params: { country?: string } = {}) =>
    api.delete<{ message: string }>(`/dashboard/articles/${id}${buildQuery(withCountry(params))}`),
};

// ===== Posts management =====
export interface PostInput {
  title: string;
  content: string;
  category_id?: number;
  alt?: string;
  meta_description?: string;
  keywords?: string;
  is_active?: boolean;
  is_featured?: boolean;
  image?: File;
  attachments?: File[];
}

function postFormData(input: PostInput) {
  const formData = new FormData();

  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (key === "attachments" || key === "image") return;
    formData.append(key, String(value));
  });

  if (input.image instanceof File) {
    formData.append("image", input.image);
  }
  input.attachments?.forEach((file) => {
    if (file instanceof File) {
      formData.append("attachments[]", file);
    }
  });

  return formData;
}

function hasPostFiles(input: PostInput) {
  return input.image instanceof File || !!input.attachments?.some((file) => file instanceof File);
}

export const adminPostsApi = {
  list: (
    params: {
      page?: number;
      per_page?: number;
      search?: string;
      category_id?: number | string;
      is_active?: number | string;
      featured?: number | string;
      country?: string;
    } = {},
  ) =>
    api.get<Post[]>(`/dashboard/posts${buildQuery(withCountry(params))}`),
  listWithMeta: (
    params: {
      page?: number;
      per_page?: number;
      search?: string;
      category_id?: number | string;
      is_active?: number | string;
      featured?: number | string;
      country?: string;
    } = {},
  ) => api.get<AdminPaginatedResponse<Post>>(`/dashboard/posts${buildQuery(withCountry(params))}`, { raw: true }),
  create: (input: PostInput, params: { country?: string } = {}) => {
    const path = `/dashboard/posts${buildQuery(withCountry(params))}`;
    return hasPostFiles(input)
      ? api.post<Post>(path, postFormData(input), { isForm: true })
      : api.post<Post>(path, input);
  },
  toggleStatus: (id: number | string, params: { country?: string } = {}) =>
    api.post<{ message: string }>(`/dashboard/posts/${id}/toggle-status${buildQuery(withCountry(params))}`),
  update: (
    id: number | string,
    input: Partial<{ title: string; content: string; category_id?: number; is_active?: boolean; is_featured?: boolean }>,
    params: { country?: string } = {},
  ) =>
    api.put<Post>(`/dashboard/posts/${id}${buildQuery(withCountry(params))}`, input),
  delete: (id: number | string, params: { country?: string } = {}) =>
    api.delete<{ message: string }>(`/dashboard/posts/${id}${buildQuery(withCountry(params))}`),
};

// ===== Categories management =====
// Mirrors services.CreateCategoryRequest / UpdateCategoryRequest in the Go backend.
export interface CategoryInput {
  name: string;
  slug?: string;
  icon?: string;
  parent_id?: number | null;
  is_active?: boolean;
  depth?: number;
}

export const adminCategoriesApi = {
  list: (params: { country?: string } = {}) =>
    api.get<Category[]>(`/dashboard/categories${buildQuery(withCountry(params))}`),
  create: (input: CategoryInput, params: { country?: string } = {}) =>
    api.post<Category>(`/dashboard/categories${buildQuery(withCountry(params))}`, input),
  show: (id: number | string, params: { country?: string } = {}) =>
    api.get<Category>(`/dashboard/categories/${id}${buildQuery(withCountry(params))}`),
  update: (id: number | string, input: Partial<CategoryInput>, params: { country?: string } = {}) =>
    api.put<Category>(`/dashboard/categories/${id}${buildQuery(withCountry(params))}`, input),
  uploadImages: (id: number | string, formData: FormData, params: { country?: string } = {}) =>
    api.post<Category>(`/dashboard/categories/${id}/images${buildQuery(withCountry(params))}`, formData, { isForm: true }),
  toggleStatus: (id: number | string, params: { country?: string } = {}) =>
    api.post<{ message: string }>(`/dashboard/categories/${id}/toggle${buildQuery(withCountry(params))}`),
  delete: (id: number | string, params: { country?: string } = {}) =>
    api.delete<{ message: string }>(`/dashboard/categories/${id}${buildQuery(withCountry(params))}`),
};

// ===== Comments management =====
// NOTE: the `:database` path segment is the COUNTRY code (jo/sa/eg/ps), not a
// content type. Articles vs posts are selected with `commentable_type`.
export interface AdminCommentListParams {
  page?: number;
  per_page?: number;
  /** "approved" | "pending" | "rejected" — omit for all. */
  status?: string;
  /** Free-text search over the comment body. */
  q?: string;
  commentable_type?: string;
  commentable_id?: number | string;
}

export const adminCommentsApi = {
  listWithMeta: (country: string, params: AdminCommentListParams = {}) =>
    api.get<AdminPaginatedResponse<Comment>>(
      `/dashboard/comments/${country}${buildQuery(params as Record<string, unknown>)}`,
      { raw: true },
    ),
  bulkDelete: (country: string, ids: number[]) =>
    api.post<{ message: string }>(`/dashboard/comments/${country}/bulk-delete`, { ids }),
  approve: (country: string, id: number | string) =>
    api.post<{ message: string }>(`/dashboard/comments/${country}/${id}/approve`),
  reject: (country: string, id: number | string) =>
    api.post<{ message: string }>(`/dashboard/comments/${country}/${id}/reject`),
  delete: (country: string, id: number | string) =>
    api.delete<{ message: string }>(`/dashboard/comments/${country}/${id}`),
};

// ===== Files management =====
export type FileSortBy = "created_at" | "file_name" | "file_size" | "download_count" | "view_count";

export interface AdminFileListParams {
  page?: number;
  per_page?: number;
  /** Extension-ish type, e.g. "pdf" / "doc". */
  type?: string;
  file_category?: string;
  article_id?: number | string;
  post_id?: number | string;
  /** Free-text search over the stored file name. */
  q?: string;
  sort_by?: FileSortBy;
  sort_dir?: "asc" | "desc";
  country?: string;
}

export const adminFilesApi = {
  list: (params: Record<string, unknown> = {}) =>
    api.get<FileItem[]>(`/dashboard/files${buildQuery(withCountry(params))}`),
  listWithMeta: (params: AdminFileListParams = {}) =>
    api.get<AdminPaginatedResponse<FileItem>>(
      `/dashboard/files${buildQuery(withCountry(params as Record<string, unknown>))}`,
      { raw: true },
    ),
  upload: (formData: FormData, params: { country?: string } = {}) =>
    api.post<FileItem>(`/dashboard/files${buildQuery(withCountry(params))}`, formData, { isForm: true }),
  info: (id: number | string, params: { country?: string } = {}) =>
    api.get<FileItem>(`/dashboard/files/${id}/info${buildQuery(withCountry(params))}`),
  show: (id: number | string, params: { country?: string } = {}) =>
    api.get<FileItem>(`/dashboard/files/${id}${buildQuery(withCountry(params))}`),
  update: (id: number | string, input: Partial<FileItem>, params: { country?: string } = {}) =>
    api.put<FileItem>(`/dashboard/files/${id}${buildQuery(withCountry(params))}`, input),
  delete: (id: number | string, params: { country?: string } = {}) =>
    api.delete<{ message: string }>(`/dashboard/files/${id}${buildQuery(withCountry(params))}`),
};
