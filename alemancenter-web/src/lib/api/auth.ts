import { api } from "./client";
import type { AuthTokens, User } from "./types";

// The Go backend returns login/register/social-login responses with the
// access token at the TOP level (as `token`, not nested under `data`), while
// `data` holds the user object. Our generic client auto-unwraps `data`,
// which would strip the token — so these auth calls use `raw: true` and
// rebuild the AuthTokens shape here.
interface RawAuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  access_token?: string;
  refresh_token?: string;
  data?: User;
}

function toAuthTokens(raw: RawAuthResponse): AuthTokens {
  const accessToken = raw.access_token ?? raw.token;
  if (!accessToken) {
    throw new Error("لم يتم استلام رمز الدخول من الخادم");
  }
  return {
    access_token: accessToken,
    refresh_token: raw.refresh_token,
    user: raw.data,
  };
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export type UpdateProfileInput = Partial<User> | FormData;

export const authApi = {
  checkEmail: (email: string) =>
    api.post<{ exists: boolean }>("/auth/check-email", { email }, { skipAuth: true }),

  register: async (input: RegisterInput) =>
    toAuthTokens(
      await api.post<RawAuthResponse>("/auth/register", input, { skipAuth: true, raw: true }),
    ),

  login: async (input: LoginInput) =>
    toAuthTokens(
      await api.post<RawAuthResponse>("/auth/login", input, { skipAuth: true, raw: true }),
    ),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>("/auth/password/forgot", { email }, { skipAuth: true }),

  resetPassword: (input: { token: string; email: string; password: string; password_confirmation: string }) =>
    api.post<{ message: string }>("/auth/password/reset", input, { skipAuth: true }),

  googleTokenLogin: async (idToken: string) =>
    toAuthTokens(
      await api.post<RawAuthResponse>(
        "/auth/google/token",
        { token: idToken },
        { skipAuth: true, raw: true },
      ),
    ),

  facebookTokenLogin: async (accessToken: string) =>
    toAuthTokens(
      await api.post<RawAuthResponse>(
        "/auth/facebook/token",
        { token: accessToken },
        { skipAuth: true, raw: true },
      ),
    ),

  logout: () => api.post<{ message: string }>("/auth/logout"),

  me: () => api.get<User>("/auth/user"),

  updateProfile: (input: UpdateProfileInput) =>
    api.put<User>("/auth/profile", input, { isForm: input instanceof FormData }),

  resendVerification: () => api.post<{ message: string }>("/auth/email/resend"),

  changeUnverifiedEmail: (email: string) =>
    api.post<{ message: string }>("/auth/email/change", { email }),

  deleteAccount: (password: string) => api.post<{ message: string }>("/auth/account/delete", { password }),
};
