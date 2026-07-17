import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const UPSTREAM_BASE = "https://api.alemancenter.com/api";
const FRONTEND_KEY = process.env["ALEMANCENTER_FRONTEND_API_KEY"];

const COOKIE_NAME = "rt";
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// ─── Zod input schemas ────────────────────────────────────────────────────────

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256),
});

const RegisterSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(254),
  password: z.string().min(8).max(256),
  password_confirmation: z.string().min(1).max(256),
});

const SocialTokenSchema = z.object({
  token: z.string().min(1).max(4096),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseBody(req: Request): unknown {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) return {};
  try {
    return JSON.parse(req.body.toString());
  } catch {
    return null;
  }
}

function buildUpstreamHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (FRONTEND_KEY) headers["X-Frontend-Key"] = FRONTEND_KEY;
  if (req.headers.authorization) headers["Authorization"] = req.headers.authorization;
  if (req.headers["accept-language"]) {
    const lang = req.headers["accept-language"];
    headers["Accept-Language"] = Array.isArray(lang) ? lang.join(", ") : lang;
  }
  // Real client IP (via trust-proxy) so upstream per-IP login rate limiting
  // targets the actual client instead of lumping everyone under the proxy IP.
  if (req.ip) headers["X-Forwarded-For"] = req.ip;
  return headers;
}

async function callUpstream(
  req: Request,
  path: string,
  body: unknown,
): Promise<{ status: number; data: unknown }> {
  const url = `${UPSTREAM_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: buildUpstreamHeaders(req),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE_MS,
    path: "/api/auth",
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/api/auth" });
}

// The Go backend returns tokens either at the TOP level (login/register/social:
// { success, token, refresh_token, data: user }) or wrapped under `data`
// (refresh: { success, message, data: { token, refresh_token } }).  These two
// helpers handle both shapes so the refresh token always ends up in the
// httpOnly cookie and never in a JSON body readable by browser JS.

function extractRefreshToken(data: unknown): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  if (typeof record["refresh_token"] === "string") return record["refresh_token"];
  const nested = record["data"];
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const nestedToken = (nested as Record<string, unknown>)["refresh_token"];
    if (typeof nestedToken === "string") return nestedToken;
  }
  return null;
}

function stripRefreshToken(data: unknown): unknown {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { refresh_token: _rt, ...rest } = data as Record<string, unknown>;
  const nested = rest["data"];
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refresh_token: _nestedRt, ...nestedRest } = nested as Record<string, unknown>;
    rest["data"] = nestedRest;
  }
  return rest;
}

// Shared response handling for all upstream auth calls: on success move the
// refresh token (wherever the backend put it) into the httpOnly cookie and
// strip it from the JSON forwarded to the browser.
function sendAuthResponse(res: Response, status: number, data: unknown) {
  if (status === 200) {
    const refreshToken = extractRefreshToken(data);
    if (refreshToken) {
      setRefreshCookie(res, refreshToken);
      return res.status(status).json(stripRefreshToken(data));
    }
  }
  return res.status(status).json(data);
}

function handleUpstreamError(res: Response, err: unknown, path: string) {
  logger.error({ err, path }, "Auth upstream request failed");
  res.status(502).json({ success: false, message: "تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً" });
}

function validateBody<T>(
  schema: z.ZodType<T>,
  body: unknown,
  res: Response,
): T | null {
  if (body === null) {
    res.status(400).json({ success: false, message: "بيانات الطلب غير صحيحة" });
    return null;
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      message: "بيانات الطلب غير مكتملة أو غير صحيحة",
    });
    return null;
  }
  return result.data;
}

// ─── POST /login ─────────────────────────────────────────────────────────────

router.post("/login", async (req: Request, res: Response) => {
  const input = validateBody(LoginSchema, parseBody(req), res);
  if (!input) return;
  try {
    const { status, data } = await callUpstream(req, "/auth/login", input);
    return sendAuthResponse(res, status, data);
  } catch (err) {
    handleUpstreamError(res, err, "/auth/login");
    return;
  }
});

// ─── POST /register ───────────────────────────────────────────────────────────

router.post("/register", async (req: Request, res: Response) => {
  const input = validateBody(RegisterSchema, parseBody(req), res);
  if (!input) return;
  try {
    const { status, data } = await callUpstream(req, "/auth/register", input);
    return sendAuthResponse(res, status, data);
  } catch (err) {
    handleUpstreamError(res, err, "/auth/register");
    return;
  }
});

// ─── POST /google/token ───────────────────────────────────────────────────────

router.post("/google/token", async (req: Request, res: Response) => {
  const input = validateBody(SocialTokenSchema, parseBody(req), res);
  if (!input) return;
  try {
    const { status, data } = await callUpstream(req, "/auth/google/token", input);
    return sendAuthResponse(res, status, data);
  } catch (err) {
    handleUpstreamError(res, err, "/auth/google/token");
    return;
  }
});

// ─── POST /facebook/token ─────────────────────────────────────────────────────

router.post("/facebook/token", async (req: Request, res: Response) => {
  const input = validateBody(SocialTokenSchema, parseBody(req), res);
  if (!input) return;
  try {
    const { status, data } = await callUpstream(req, "/auth/facebook/token", input);
    return sendAuthResponse(res, status, data);
  } catch (err) {
    handleUpstreamError(res, err, "/auth/facebook/token");
    return;
  }
});

// ─── POST /refresh ────────────────────────────────────────────────────────────
// Reads refresh token from httpOnly cookie only — no body needed from client.

router.post("/refresh", async (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cookies = (req as any).cookies as Record<string, string> | undefined;
  const refreshToken = cookies?.[COOKIE_NAME];
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: "انتهت الجلسة، يرجى تسجيل الدخول مجدداً" });
  }
  try {
    const { status, data } = await callUpstream(req, "/auth/refresh", {
      refresh_token: refreshToken,
    });
    if (status === 401) {
      clearRefreshCookie(res);
    }
    return sendAuthResponse(res, status, data);
  } catch (err) {
    handleUpstreamError(res, err, "/auth/refresh");
    return;
  }
});

// ─── POST /logout ─────────────────────────────────────────────────────────────

router.post("/logout", async (req: Request, res: Response) => {
  clearRefreshCookie(res);
  try {
    const { status, data } = await callUpstream(req, "/auth/logout", {});
    return res.status(status).json(data);
  } catch {
    return res.status(200).json({ success: true, message: "تم تسجيل الخروج بنجاح" });
  }
});

// ─── Catch-all: pass unhandled auth paths through to the generic proxy ────────
// (e.g. GET /auth/user, POST /auth/password/forgot, etc.)

router.use((_req: Request, _res: Response, next: NextFunction) => {
  next();
});

export default router;
