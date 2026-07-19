import path from "node:path";
import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import imgRouter from "./routes/img";
import proxyRouter from "./routes/proxy";
import { logger } from "./lib/logger";

const app: Express = express();

// Directory of the built SPA (index.html + assets). Defaults to ./public next
// to the app root, which matches the Plesk "Document Root" (/httpdocs/public).
const STATIC_DIR = process.env["STATIC_DIR"] || path.resolve(process.cwd(), "public");

// Replit's shared reverse proxy sits in front of this service, so trust exactly
// one hop for X-Forwarded-For to be parsed correctly by express-rate-limit.
app.set("trust proxy", 1);

const isProduction = process.env["NODE_ENV"] === "production";

// Allowed browser origins: Replit-provided domains plus an explicit
// ALLOWED_ORIGINS env (comma-separated full origins, e.g.
// "https://alemancenter.com,https://www.alemancenter.com") for non-Replit
// deployments.
const allowedOrigins = new Set([
  ...[
    ...(process.env["REPLIT_DOMAINS"]?.split(",") ?? []),
    process.env["REPLIT_DEV_DOMAIN"],
  ]
    .filter((domain): domain is string => !!domain)
    .map((domain) => `https://${domain.trim()}`),
  ...(process.env["ALLOWED_ORIGINS"]?.split(",") ?? [])
    .map((origin) => origin.trim())
    .filter(Boolean),
]);

// Requests without an Origin header (same-origin GETs, curl, health checks)
// are always allowed; cross-origin requests must match the allowlist.  An
// empty allowlist only falls back to allow-all outside production — in
// production it fails closed, because CORS runs with credentials enabled.
function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  return allowedOrigins.size === 0 && !isProduction;
}

if (!process.env["ALEMANCENTER_FRONTEND_API_KEY"]) {
  const message = "ALEMANCENTER_FRONTEND_API_KEY is not set";
  if (isProduction) {
    throw new Error(`${message}; refusing to start production without X-Frontend-Key`);
  }
  logger.warn(`${message} — upstream requests will be sent without X-Frontend-Key`);
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  helmet({
    // This server now serves BOTH the SPA (HTML) and the API (JSON). The SPA
    // ships its own tuned CSP via a <meta> tag in index.html, so we do NOT set a
    // global CSP header here (a default-src 'none' header would break the app).
    // The strict API-only CSP is applied just below, scoped to /api.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xContentTypeOptions: true,
    xFrameOptions: { action: "deny" },
    hsts: {
      maxAge: 31_536_000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);

// Strict CSP for the API surface only (locks down /api/img SVG rendering etc.).
app.use("/api", (_req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  next();
});

app.use((_req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      callback(null, isOriginAllowed(origin));
    },
    credentials: true,
  }),
);

// cors() with origin:false only omits the CORS headers — the request itself
// would still reach the proxy.  Reject disallowed origins outright so
// cross-site requests can't cause side effects upstream.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!isOriginAllowed(origin)) {
    res.status(403).json({ success: false, message: "Origin غير مصرح بالوصول" });
    return;
  }
  next();
});

// Parse cookies so auth routes can read/write httpOnly refresh-token cookie.
app.use(cookieParser());

const generalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "محاولات كثيرة جداً، يرجى المحاولة لاحقاً" },
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "تجاوزت الحد المسموح لإرسال الرسائل، يرجى المحاولة لاحقاً" },
});

const searchLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "طلبات كثيرة جداً، يرجى الإبطاء" },
});

app.use("/api", generalLimiter);
// No body parser here: the health check is a GET with no body, and mounting
// express.json() on the broader "/api" prefix would consume the request
// body stream for every /api/* request (including ones meant for the
// raw-body proxy below, e.g. POST /api/auth/login), leaving the proxy with
// an empty body.
app.use("/api", healthRouter);

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/front/contact", contactLimiter);
app.use("/api/front/search", searchLimiter);

// Single raw-body parser for all /api routes.  Auth routes and the proxy both
// receive req.body as a Buffer; each handler is responsible for parsing it.
app.use(
  "/api",
  express.raw({ type: "*/*", limit: "25mb" }),
);

// Dedicated auth routes — intercept login/register/refresh/logout to manage
// the httpOnly refresh-token cookie.  Unhandled auth paths fall through to
// the generic proxy below.
app.use("/api/auth", authRouter);

// Image optimization endpoint — resizes and converts upstream storage images.
app.use("/api/img", imgRouter);

// Generic reverse-proxy — forwards everything else to the upstream backend.
app.use("/api", proxyRouter);

// ─── Static SPA + client-side routing fallback ────────────────────────────────
// Everything that is NOT /api is the single-page app. Fingerprinted assets get a
// long immutable cache; index.html is never cached so new deploys show instantly.
app.use(
  express.static(STATIC_DIR, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-cache, must-revalidate");
      } else if (/[\\/]assets[\\/]/.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  }),
);

// Any other GET falls back to the SPA entry so the client router can handle it.
app.get(/.*/, (_req, res) => {
  res.setHeader("Cache-Control", "no-cache, must-revalidate");
  res.sendFile(path.join(STATIC_DIR, "index.html"));
});

export default app;
