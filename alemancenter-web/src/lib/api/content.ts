import { api, buildQuery, API_BASE } from "./client";
import type { Article, Category, Comment, Keyword, Post } from "./types";

export interface ArticleListParams {
  page?: number;
  per_page?: number;
  grade_level?: string;
  subject_id?: number;
  semester_id?: number;
  q?: string;
  order?: string;
  country?: string;
  [key: string]: unknown;
}

export interface PostListParams {
  page?: number;
  per_page?: number;
  category_id?: number | string;
  q?: string;
  country?: string;
  [key: string]: unknown;
}

export const articlesApi = {
  list: (params: ArticleListParams = {}) =>
    api.get<Article[]>(`/articles${buildQuery(params)}`, { skipAuth: true }),

  show: (id: number | string) =>
    api.get<Article>(`/articles/${id}`, { skipAuth: true }),

  byClass: (gradeLevel: string, params: ArticleListParams = {}) =>
    api.get<Article[]>(`/articles/by-class/${gradeLevel}${buildQuery(params)}`, { skipAuth: true }),

  byKeyword: (keyword: string, params: ArticleListParams = {}) =>
    api.get<Article[]>(
      `/articles/by-keyword/${encodeURIComponent(keyword)}${buildQuery(params)}`,
      { skipAuth: true },
    ),

  // Frontend interstitial download PAGE (not the file itself).
  downloadUrl: (id: number | string) => `/articles/file/${id}/download`,

  // Backend returns a short-lived signed token; the file itself is then
  // streamed from signedDownloadUrl(token).
  // Sends the auth token when present — the backend's DownloadAuthGate may
  // require a verified logged-in user (setting: require_login_for_download).
  getDownloadToken: (id: number | string) =>
    api.get<{ token: string }>(`/articles/file/${id}/download-url`),

  signedDownloadUrl: (token: string) =>
    `${API_BASE}/articles/download?token=${encodeURIComponent(token)}`,
};

export const postsApi = {
  list: (params: PostListParams = {}) =>
    api.get<Post[]>(`/posts${buildQuery(params)}`, { skipAuth: true }),

  show: (id: number | string) => api.get<Post>(`/posts/${id}`, { skipAuth: true }),

  incrementView: (id: number | string) =>
    api.post<{ message: string }>(`/posts/${id}/increment-view`, undefined, { skipAuth: true }),

  getDownloadToken: (id: number | string) =>
    api.get<{ token: string }>(`/posts/file/${id}/download-url`),

  signedDownloadUrl: (token: string) =>
    `${API_BASE}/posts/download?token=${encodeURIComponent(token)}`,
};

export const categoriesApi = {
  list: (country: string) =>
    api.get<Category[]>(`/categories${buildQuery({ country })}`, { skipAuth: true }),
  show: (id: number | string) => api.get<Category>(`/categories/${id}`, { skipAuth: true }),
};

// The backend's :database path segment is the COUNTRY code (jo/sa/eg/ps) —
// articles vs posts are distinguished by `commentable_type`, which is the
// Laravel-era polymorphic class name still stored in the DB.
export const COMMENTABLE_TYPES = {
  articles: "App\\Models\\Article",
  posts: "App\\Models\\Post",
} as const;

export type CommentableKind = keyof typeof COMMENTABLE_TYPES;

export const commentsApi = {
  list: (country: string, kind: CommentableKind, params: { commentable_id?: number } = {}) =>
    api.get<Comment[]>(
      `/comments/${country}${buildQuery({ ...params, commentable_type: COMMENTABLE_TYPES[kind] })}`,
      { skipAuth: true },
    ),

  create: (
    country: string,
    kind: CommentableKind,
    input: { body: string; commentable_id: number },
  ) =>
    api.post<Comment>(`/comments/${country}`, {
      ...input,
      commentable_type: COMMENTABLE_TYPES[kind],
    }),

  createReaction: (input: { comment_id: number; type: string }) =>
    api.post<{ message: string }>("/reactions", input),

  deleteReaction: (commentId: number | string) =>
    api.delete<{ message: string }>(`/reactions/${commentId}`),

  getReactions: (commentId: number | string) =>
    api.get<{ counts: Record<string, number> }>(`/reactions/${commentId}`),
};

export const keywordsApi = {
  list: (country: string) =>
    api.get<Keyword[]>(`/keywords${buildQuery({ country })}`, { skipAuth: true }),
  show: (keyword: string) =>
    api.get<Keyword>(`/keywords/${encodeURIComponent(keyword)}`, { skipAuth: true }),
};

export const filesApi = {
  info: (id: number | string) =>
    api.get<Record<string, unknown>>(`/files/${id}/info`, { skipAuth: true }),
  incrementView: (id: number | string) =>
    api.post<{ message: string }>(`/files/${id}/increment-view`, undefined, { skipAuth: true }),
  uploadImage: (file: File) => {
    const form = new FormData();
    form.append("image", file);
    return api.post<{ url: string; path?: string; name?: string }>("/upload/image", form, { isForm: true });
  },
  uploadDocument: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<{ url: string; path?: string; name?: string }>("/upload/file", form, { isForm: true });
  },
};
