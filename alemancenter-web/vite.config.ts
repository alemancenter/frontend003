import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Fill in values from .env / .env.local (git-ignored, local dev only) for
// anything the real hosting environment hasn't already set. Real deployment
// env vars always take precedence over the local .env file.
const fileEnv = loadEnv(process.env.NODE_ENV ?? "development", import.meta.dirname, "");
for (const [key, value] of Object.entries(fileEnv)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

// In local dev, forward /api to the local api-server (same architecture as
// production: alemancenter-web is static and never talks to the upstream
// Alemancenter API directly — api-server does that and injects the
// X-Frontend-Key secret server-side). Point this at the api-server's local
// port; it must be running separately (see artifacts/api-server).
const apiServerUrl = process.env.API_SERVER_URL ?? "http://localhost:8080";

const apiProxy = {
  "/api": {
    target: apiServerUrl,
    changeOrigin: true,
  },
};

export default defineConfig(async ({ command }) => ({
  base: basePath,
  // Statically replace process.env.NODE_ENV so React/React-DOM dead-code-strip
  // their development branches in the production build. Without this the dev
  // build of react-dom (~470 KB) was shipping to users, badly hurting load time.
  define: {
    "process.env.NODE_ENV": JSON.stringify(command === "build" ? "production" : "development"),
  },
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Target modern browsers so the shipped JS isn't down-levelled with heavy
    // polyfills — smaller, faster-parsing bundles on the critical path.
    target: "es2020",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Split rarely-changing vendor code into stable, separately-cacheable
        // chunks. This keeps the app chunk small, lets the browser download
        // vendors in parallel, and preserves cache across app-only deploys.
        // Only split out libraries that are genuinely on every page's critical
        // path (the app shell, router, data layer, base UI primitives, icons).
        // Everything else — charts, date-fns, form/zod, sanitizer — returns
        // undefined so Rollup bundles it INTO the lazy route that imports it and
        // it never gets preloaded on the home page.
        manualChunks(id) {
          const normalizedId = id.replaceAll("\\", "/");
          if (!normalizedId.includes("/node_modules/")) return undefined;
          if (
            normalizedId.includes("/node_modules/react/") ||
            normalizedId.includes("/node_modules/react-dom/") ||
            normalizedId.includes("/node_modules/scheduler/")
          ) {
            return "react";
          }
          if (normalizedId.includes("/node_modules/@tanstack/")) return "query";
          if (normalizedId.includes("/node_modules/wouter/")) return "router";
          if (normalizedId.includes("/node_modules/@radix-ui/")) return "radix";
          return undefined;
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: apiProxy,
    fs: {
      strict: true,
    },
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
      "X-XSS-Protection": "1; mode=block",
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: apiProxy,
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
      "X-XSS-Protection": "1; mode=block",
    },
  },
}));
