import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { photos } from "../../db/schema.js";

const PHOTO_STORE = "product-photos";

// Streams an uploaded product image out of Netlify Blobs. Photos carried over
// from the original static site are served directly by the CDN instead.
export default async (_req: Request, context: Context) => {
  const id = Number(context.params.id);
  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 });

  const [pic] = await db.select().from(photos).where(eq(photos.id, id));
  if (!pic || !pic.blobKey) return new Response("Not found", { status: 404 });

  const store = getStore(PHOTO_STORE);
  const blob = await store.get(pic.blobKey, { type: "arrayBuffer" });
  if (!blob) return new Response("Not found", { status: 404 });

  return new Response(blob, {
    headers: {
      "content-type": pic.contentType || "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};

export const config: Config = {
  path: "/api/photos/:id",
  method: "GET",
};
