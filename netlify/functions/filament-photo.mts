import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { filamentPhotos } from "../../db/schema.js";

const FILAMENT_PHOTO_STORE = "filament-photos";

// Streams a filament print photo out of Netlify Blobs. These are the example
// prints shown under each colour on the public "Colours" page.
export default async (_req: Request, context: Context) => {
  const id = Number(context.params.id);
  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 });

  const [pic] = await db.select().from(filamentPhotos).where(eq(filamentPhotos.id, id));
  if (!pic || !pic.blobKey) return new Response("Not found", { status: 404 });

  const store = getStore(FILAMENT_PHOTO_STORE);
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
  path: "/api/filament-photos/:id",
  method: "GET",
};
