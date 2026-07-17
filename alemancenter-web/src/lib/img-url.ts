/**
 * Returns an optimized image URL for a /storage/... path.
 *
 * @param storagePath  The value stored in the DB, e.g. "images/abc123.jpg"
 *                     or a full URL like "/storage/images/abc123.jpg".
 *                     External http(s) URLs are returned unchanged.
 * @param width        Target display width in CSS pixels.  The endpoint will
 *                     serve a 1x–2x version depending on device DPR; pass the
 *                     CSS pixel size and the browser will pick the right srcset
 *                     entry if you use the helper below.
 */
export function imgUrl(storagePath: string | null | undefined, width: number): string | null {
  if (!storagePath) return null;

  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return storagePath;
  }

  const clean = storagePath
    .replace(/^\/+storage\/+/, "")
    .replace(/^\/+/, "");

  if (!clean) return null;

  return `/api/img?src=${encodeURIComponent(clean)}&w=${width}`;
}

/**
 * Returns a srcset string with 1x and 2x variants via the img endpoint.
 * Drop this into <img srcSet={imgSrcSet(path, 80)} sizes="80px" />.
 */
export function imgSrcSet(storagePath: string | null | undefined, cssWidth: number): string | undefined {
  if (!storagePath) return undefined;
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) return undefined;

  const w1 = imgUrl(storagePath, cssWidth);
  const w2 = imgUrl(storagePath, cssWidth * 2);
  if (!w1 || !w2) return undefined;
  return `${w1} 1x, ${w2} 2x`;
}
