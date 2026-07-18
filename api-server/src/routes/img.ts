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

    if (isSvg) {
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Vary", "Accept");
      res.send(buf);
      return;
    }

    const inputBuffer = Buffer.from(await upstream.arrayBuffer());

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
