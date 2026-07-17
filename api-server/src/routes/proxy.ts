import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const UPSTREAM_BASE = "https://api.alemancenter.com/api";
const FRONTEND_KEY = process.env["ALEMANCENTER_FRONTEND_API_KEY"];

const HOP_BY_HOP_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "accept-encoding",
  // Spoofable identity headers — the upstream FrontendGuard derives the client
  // IP from these, so a browser must never be able to set them through us.
  // We re-add a trustworthy X-Forwarded-For below from req.ip.
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
  "x-real-ip",
  "cf-connecting-ip",
  "forwarded",
  // The frontend key is a server-side secret; never forward a client-supplied one.
  "x-frontend-key",
  // Our own session cookies (httpOnly refresh token) are none of the upstream's
  // business on generic proxied calls — auth flows go through routes/auth.ts.
  "cookie",
]);

const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "transfer-encoding",
  // Upstream cookies must not be planted on our origin; cookie management is
  // owned exclusively by routes/auth.ts.
  "set-cookie",
]);

// ─── Per-path request body validators ────────────────────────────────────────
// These schemas validate the body of specific high-risk proxied paths before
// forwarding.  Keys are the path component after /api (no query string).

const PROXY_VALIDATORS: Record<string, z.ZodTypeAny> = {
  "/front/contact": z.object({
    name: z.string().min(1).max(200),
    email: z.string().email().max(254),
    phone: z.string().max(30).optional(),
    subject: z.string().max(300).optional(),
    message: z.string().min(1).max(5000),
  }),
  "/front/search": z.object({
    query: z.string().min(1).max(200),
    page: z.coerce.number().int().positive().optional(),
    per_page: z.coerce.number().int().positive().max(100).optional(),
    category: z.string().max(100).optional(),
  }),
};

// ─── Validation helpers ───────────────────────────────────────────────────────

function getProxyPath(req: Request): string {
  return req.originalUrl.replace(/^\/api/, "").split("?")[0];
}

// Builds and confines the upstream URL: after normalization the path must stay
// under the upstream /api prefix (blocks "/api/../storage"-style escapes, both
// literal and percent-encoded).
function buildTargetUrl(req: Request): URL | null {
  const rest = req.originalUrl.replace(/^\/api/, "") || "/";
  let url: URL;
  try {
    url = new URL(`${UPSTREAM_BASE}${rest}`);
  } catch {
    return null;
  }
  if (url.origin !== new URL(UPSTREAM_BASE).origin) return null;
  if (url.pathname !== "/api" && !url.pathname.startsWith("/api/")) return null;
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  if (decodedPath.includes("..") || decodedPath.includes("\\")) return null;
  return url;
}

function validateProxyBody(req: Request, res: Response, upstreamPath: string): boolean {
  if (!["POST", "PUT", "PATCH"].includes(req.method)) return true;

  const contentType = (req.headers["content-type"] ?? "").toLowerCase();
  if (!contentType.includes("application/json")) return true;
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) return true;

  // General: reject non-parseable JSON bodies claiming to be JSON.
  let parsed: unknown;
  try {
    parsed = JSON.parse(req.body.toString());
  } catch {
    res.status(400).json({ success: false, message: "بيانات الطلب غير صحيحة" });
    return false;
  }

  // Path-specific: validate against schema when one is registered.
  const validator = PROXY_VALIDATORS[upstreamPath];
  if (validator) {
    const result = validator.safeParse(parsed);
    if (!result.success) {
      res.status(400).json({ success: false, message: "بيانات الطلب غير مكتملة أو غير صحيحة" });
      return false;
    }
  }

  return true;
}

// ─── Proxy handler ────────────────────────────────────────────────────────────

router.all(/.*/, async (req: Request, res: Response) => {
  const upstreamPath = getProxyPath(req);
  const target = buildTargetUrl(req);
  if (!target) {
    res.status(400).json({ success: false, message: "مسار الطلب غير صالح" });
    return;
  }
  const targetUrl = target.toString();

  if (!validateProxyBody(req, res, upstreamPath)) return;

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    if (HOP_BY_HOP_REQUEST_HEADERS.has(key.toLowerCase())) continue;
    headers[key] = Array.isArray(value) ? value.join(", ") : value;
  }
  if (FRONTEND_KEY) {
    headers["X-Frontend-Key"] = FRONTEND_KEY;
  }
  // Forward the real client IP (as resolved by trust-proxy) so upstream
  // rate limiting and IP blocking apply per client, not per proxy.
  if (req.ip) {
    headers["X-Forwarded-For"] = req.ip;
  }

  const hasBody =
    !["GET", "HEAD"].includes(req.method) &&
    Buffer.isBuffer(req.body) &&
    req.body.length > 0;

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: hasBody ? req.body : undefined,
    });

    res.status(upstreamRes.status);
    upstreamRes.headers.forEach((value, key) => {
      if (HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase())) return;
      res.setHeader(key, value);
    });

    const buffer = Buffer.from(await upstreamRes.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    req.log?.error({ err, targetUrl }, "Proxy request to upstream API failed");
    logger.error({ err, targetUrl }, "Proxy request to upstream API failed");
    res.status(502).json({
      success: false,
      message: "تعذر الاتصال بالخادم، يرجى المحاولة لاحقاً",
    });
  }
});

export default router;
