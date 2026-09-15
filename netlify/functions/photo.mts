import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { photos } from "../../db/schema.js";
import { immutableAssetHeaders } from "../../server/cache.js";
import { BLOB_KEY_PATTERN, LEGACY_ID_PATTERN, sniffImageType } from "../../server/imageType.js";

const PHOTO_STORE = "product-photos";
const PREFIX = "/api/photos/";

// Streams an uploaded product image out of Netlify Blobs. Photos carried over
// from the original static site are served directly by the CDN instead.
//
// The path carries the Blobs key, not the `photos` row id, specifically so that
// this does no database work: these are the most numerous and most scattered
// requests on the site, and a database woken by one of them bills for its whole
// active period plus an idle timeout (see server/imageType.ts). Requests using
// the older row-id URLs still resolve, through the one query this can no longer
// avoid, until the payloads carrying them have turned over.
export default async (req: Request) => {
  const segment = decodeURIComponent(new URL(req.url).pathname.slice(PREFIX.length));

  let blobKey: string | null = null;
  // Only the legacy path knows the stored content type; the fast path derives it
  // from the bytes instead.
  let contentType: string | null = null;

  if (BLOB_KEY_PATTERN.test(segment)) {
    blobKey = segment;
  } else if (LEGACY_ID_PATTERN.test(segment)) {
    const [pic] = await db
      .select({ blobKey: photos.blobKey, contentType: photos.contentType })
      .from(photos)
      .where(eq(photos.id, Number(segment)));
    blobKey = pic?.blobKey ?? null;
    contentType = pic?.contentType ?? null;
  }

  if (!blobKey) return new Response("Not found", { status: 404 });

  const blob = await getStore(PHOTO_STORE).get(blobKey, { type: "arrayBuffer" });
  if (!blob) return new Response("Not found", { status: 404 });

  return new Response(blob, {
    headers: immutableAssetHeaders(contentType || sniffImageType(blob)),
  });
};

export const config: Config = {
  path: "/api/photos/*",
  method: "GET",
};
