import { Router, type IRouter, type Request, type Response } from "express";
import sharp from "sharp";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Where uploaded files are served from. Defaults to the site's own /storage
// path (served by nginx from the backend's uploads folder), which avoids a
// dependency on the api subdomain's /storage routing. Override with
// STORAGE_UPSTREAM if the files live elsewhere.
const UPSTREAM_STORAGE = (process.env["STORAGE_UPSTREAM"] || "https://alemancenter.com/storage").replace(/\/+$/, "");

const ALLOWED_SRC_RE = /^[a-zA-Z0-9/_.-]+$/;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 256;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
]);

async function readLimitedResponse(upstream: globalThis.Response): Promise<Buffer | null> {
  const contentLength = Number(upstream.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
    return null;
  }

  const reader = upstream.body?.getReader();
  if (!reader) return Buffer.from(await upstream.arrayBuffer());

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

router.get("/", async (req: Request, res: Response) => {
  const rawSrc = typeof req.query["src"] === "string" ? req.query["src"] : "";
  const rawW   = typeof req.query["w"]   === "string" ? req.query["w"]   : "";

  if (!rawSrc || !ALLOWED_SRC_RE.test(rawSrc) || rawSrc.includes("..")) {
    res.status(400).json({ success: false, message: "Invalid src parameter" });
    return;
  }

  const width = Math.min(
    Math.max(1, parseInt(rawW, 10) || DEFAULT_WIDTH),
    MAX_WIDTH,
  );

  const upstreamUrl = `${UPSTREAM_STORAGE}/${rawSrc.replace(/^\/+/, "")}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { "User-Agent": "alemancenter-img/1.0" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      res.status(upstream.status).json({ success: false, message: "Upstream image not found" });
      return;
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    const isSvg = contentType.includes("svg") || rawSrc.toLowerCase().endsWith(".svg");
    const normalizedContentType = contentType.split(";")[0]?.trim().toLowerCase();

    if (normalizedContentType && !ALLOWED_IMAGE_TYPES.has(normalizedContentType)) {
      res.status(415).json({ success: false, message: "Unsupported image type" });
      return;
    }

    const inputBuffer = await readLimitedResponse(upstream);
    if (!inputBuffer) {
      res.status(413).json({ success: false, message: "Image is too large" });
      return;
    }

    if (isSvg) {
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Vary", "Accept");
      res.send(inputBuffer);
      return;
    }

    const optimized = await sharp(inputBuffer)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Vary", "Accept");
    res.send(optimized);
  } catch (err) {
    logger.error({ err, upstreamUrl }, "Image optimization failed");
    res.status(502).json({ success: false, message: "Image could not be loaded" });
  }
});

export default router;
