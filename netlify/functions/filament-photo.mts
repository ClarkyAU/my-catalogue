import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { filamentPhotos } from "../../db/schema.js";
import { immutableAssetHeaders } from "../../server/cache.js";
import { BLOB_KEY_PATTERN, LEGACY_ID_PATTERN, sniffImageType } from "../../server/imageType.js";

const FILAMENT_PHOTO_STORE = "filament-photos";
const PREFIX = "/api/filament-photos/";

// Streams a filament print photo out of Netlify Blobs. These are the example
// prints shown under each colour on the public "Colours" page.
//
// Keyed off the Blobs key rather than the row id, for the reason given in
// netlify/functions/photo.mts: serving an image should not wake the database.
export default async (req: Request) => {
  const segment = decodeURIComponent(new URL(req.url).pathname.slice(PREFIX.length));

  let blobKey: string | null = null;
  let contentType: string | null = null;

  if (BLOB_KEY_PATTERN.test(segment)) {
    blobKey = segment;
  } else if (LEGACY_ID_PATTERN.test(segment)) {
    const [pic] = await db
      .select({ blobKey: filamentPhotos.blobKey, contentType: filamentPhotos.contentType })
      .from(filamentPhotos)
      .where(eq(filamentPhotos.id, Number(segment)));
    blobKey = pic?.blobKey ?? null;
    contentType = pic?.contentType ?? null;
  }

  if (!blobKey) return new Response("Not found", { status: 404 });

  const blob = await getStore(FILAMENT_PHOTO_STORE).get(blobKey, { type: "arrayBuffer" });
  if (!blob) return new Response("Not found", { status: 404 });

  return new Response(blob, {
    headers: immutableAssetHeaders(contentType || sniffImageType(blob)),
  });
};

export const config: Config = {
  path: "/api/filament-photos/*",
  method: "GET",
};
