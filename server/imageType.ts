/**
 * The content type of a stored image, read from its own leading bytes.
 *
 * This exists so that serving a photo needs no database query. A photo's URL
 * used to carry its `photos` row id, so every image the edge had not cached yet
 * cost a `SELECT` purely to turn that id into a Blobs key and a content type —
 * and Netlify Database bills for active time plus an idle timeout rather than
 * per query, so a thin trickle of image cache misses spread through the day was
 * enough to keep the database billing almost continuously. The URL now carries
 * the Blobs key itself, which leaves the format as the only thing that still
 * needed looking up, and the file already says what it is.
 *
 * Only four formats can reach the store: admin uploads are re-encoded in the
 * browser to WebP, or to JPEG where canvas cannot produce WebP, and can come
 * back as PNG if it ignored the requested type entirely (see src/admin/image.js).
 * GIF is here because it is cheap to recognise, not because anything makes one.
 */
export function sniffImageType(bytes: ArrayBuffer): string {
  const head = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 12));

  // FF D8 FF — JPEG's start-of-image marker.
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";

  // 89 "PNG" — the first four of PNG's eight-byte signature.
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) {
    return "image/png";
  }

  // "RIFF" then four bytes of length then "WEBP": a WebP is a RIFF container,
  // so the format name sits at offset 8 rather than at the front.
  if (
    head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
    head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50
  ) {
    return "image/webp";
  }

  // "GIF".
  if (head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46) return "image/gif";

  return "application/octet-stream";
}

/**
 * Blobs keys are written as `<parent row id>/<uuid>` (see the upload handlers in
 * netlify/functions/admin.mts). Matching that shape exactly is what lets a photo
 * route take a key straight out of the URL: anything else is rejected before it
 * reaches the store, so the path can never be pointed at another key.
 */
export const BLOB_KEY_PATTERN =
  /^\d+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * The original URL shape, where the path segment was a photo row id. Kept
 * working because the id is baked into share-link HTML and into any bootstrap
 * payload a browser is still holding, and those outlive the deploy that changes
 * the scheme.
 */
export const LEGACY_ID_PATTERN = /^\d+$/;
