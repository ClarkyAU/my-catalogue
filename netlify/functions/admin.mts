import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { categories, subcategories, products, photos, filaments, filamentPhotos } from "../../db/schema.js";
import { requireAdmin } from "../../server/auth.js";
import { slugify } from "../../server/catalogue.js";
import {
  listFilaments,
  normalizeStatus,
  normalizeHex,
  normalizeOptionalHex,
  normalizeColors,
  normalizeFinish,
} from "../../server/filaments.js";
import { getSettings, setSetting, SETTINGS_DEFAULTS } from "../../server/settings.js";

const PHOTO_STORE = "product-photos";
const FILAMENT_PHOTO_STORE = "filament-photos";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/** Pick a slug that is unique among `taken`, appending _2, _3, … on collision. */
function uniqueSlug(base: string, taken: Set<string>): string {
  let slug = slugify(base);
  if (!taken.has(slug)) return slug;
  let n = 2;
  while (taken.has(`${slug}_${n}`)) n++;
  return `${slug}_${n}`;
}

/** Full catalogue with internal numeric IDs, for the admin UI. */
async function adminTree() {
  const [cats, subs, prods, pics] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id)),
    db.select().from(subcategories).orderBy(asc(subcategories.sortOrder), asc(subcategories.id)),
    db.select().from(products).orderBy(asc(products.sortOrder), asc(products.id)),
    db.select().from(photos).orderBy(desc(photos.isDefault), asc(photos.sortOrder), asc(photos.id)),
  ]);

  return {
    categories: cats.map((c) => ({
      id: c.id,
      slug: c.slug,
      displayName: c.displayName,
      themeColor: c.themeColor,
      sortOrder: c.sortOrder,
      subcategories: subs
        .filter((s) => s.categoryId === c.id)
        .map((s) => ({
          id: s.id,
          slug: s.slug,
          displayName: s.displayName,
          sortOrder: s.sortOrder,
          products: prods
            .filter((p) => p.subcategoryId === s.id)
            .map((p) => ({
              id: p.id,
              slug: p.slug,
              displayName: p.displayName,
              description: p.description,
              price: p.price,
              featured: p.featured,
              sortOrder: p.sortOrder,
              photos: pics
                .filter((ph) => ph.productId === p.id)
                .map((ph) => ({
                  id: ph.id,
                  url: ph.blobKey ? `/api/photos/${ph.id}` : ph.staticUrl,
                  isDefault: ph.isDefault,
                  sortOrder: ph.sortOrder,
                  filaments: ph.filaments,
                  texture: ph.texture,
                })),
            })),
        })),
    })),
  };
}

export default async (req: Request, _context: Context) => {
  // Every admin request must pass the Identity + allowlist gate.
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const rest = new URL(req.url).pathname.replace(/^\/api\/admin\/?/, "");
  const parts = rest.split("/").filter(Boolean);
  const [resource, idPart, action] = parts;
  const id = Number(idPart);
  const method = req.method;

  const body: any =
    method === "POST" || method === "PATCH"
      ? await req.json().catch(() => ({}))
      : {};

  try {
    // GET /api/admin/session — confirm the caller is authorized.
    if (method === "GET" && resource === "session") {
      return json({ email: gate.email });
    }

    // GET /api/admin/catalogue — full tree for the admin UI.
    if (method === "GET" && (resource === "catalogue" || !resource)) {
      return json(await adminTree());
    }

    // ---------- Site settings (editable copy) ----------
    if (resource === "settings") {
      // GET /api/admin/settings — current values merged with defaults.
      if (method === "GET") {
        return json(await getSettings());
      }
      // PATCH /api/admin/settings — update one or more known settings.
      if (method === "PATCH") {
        const updated: Record<string, string> = {};
        for (const key of Object.keys(SETTINGS_DEFAULTS)) {
          if (body[key] !== undefined) {
            const value = String(body[key]);
            await setSetting(key, value);
            updated[key] = value;
          }
        }
        return json({ ...(await getSettings()), ...updated });
      }
    }

    // ---------- Categories ----------
    if (resource === "categories") {
      if (method === "POST") {
        if (!body.displayName) return json({ error: "displayName is required" }, 400);
        const existing = await db.select({ slug: categories.slug }).from(categories);
        const slug = uniqueSlug(body.displayName, new Set(existing.map((r) => r.slug)));
        const [row] = await db
          .insert(categories)
          .values({
            slug,
            displayName: body.displayName,
            themeColor: body.themeColor || "#00E5FF",
          })
          .returning();
        return json(row, 201);
      }
      if (method === "PATCH" && Number.isInteger(id)) {
        const updates: Record<string, unknown> = {};
        if (body.displayName !== undefined) updates.displayName = body.displayName;
        if (body.themeColor !== undefined) updates.themeColor = body.themeColor;
        if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
        const [row] = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();
        return row ? json(row) : json({ error: "Not found" }, 404);
      }
      if (method === "DELETE" && Number.isInteger(id)) {
        await deletePhotosForCategory(id);
        await db.delete(categories).where(eq(categories.id, id));
        return json({ ok: true });
      }
    }

    // ---------- Subcategories ----------
    if (resource === "subcategories") {
      if (method === "POST") {
        if (!body.categoryId || !body.displayName)
          return json({ error: "categoryId and displayName are required" }, 400);
        const existing = await db
          .select({ slug: subcategories.slug })
          .from(subcategories)
          .where(eq(subcategories.categoryId, body.categoryId));
        const slug = uniqueSlug(body.displayName, new Set(existing.map((r) => r.slug)));
        const [row] = await db
          .insert(subcategories)
          .values({ categoryId: body.categoryId, slug, displayName: body.displayName })
          .returning();
        return json(row, 201);
      }
      if (method === "PATCH" && Number.isInteger(id)) {
        const updates: Record<string, unknown> = {};
        if (body.displayName !== undefined) updates.displayName = body.displayName;
        if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
        if (body.categoryId !== undefined) updates.categoryId = body.categoryId;
        const [row] = await db.update(subcategories).set(updates).where(eq(subcategories.id, id)).returning();
        return row ? json(row) : json({ error: "Not found" }, 404);
      }
      if (method === "DELETE" && Number.isInteger(id)) {
        await deletePhotosForSubcategory(id);
        await db.delete(subcategories).where(eq(subcategories.id, id));
        return json({ ok: true });
      }
    }

    // ---------- Products ----------
    if (resource === "products") {
      if (method === "POST") {
        if (!body.subcategoryId || !body.displayName)
          return json({ error: "subcategoryId and displayName are required" }, 400);
        const existing = await db
          .select({ slug: products.slug })
          .from(products)
          .where(eq(products.subcategoryId, body.subcategoryId));
        const slug = uniqueSlug(body.displayName, new Set(existing.map((r) => r.slug)));
        const [row] = await db
          .insert(products)
          .values({
            subcategoryId: body.subcategoryId,
            slug,
            displayName: body.displayName,
            description: body.description || "",
            price: normalizePrice(body.price),
            featured: Boolean(body.featured),
          })
          .returning();
        return json(row, 201);
      }
      if (method === "PATCH" && Number.isInteger(id)) {
        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (body.displayName !== undefined) updates.displayName = body.displayName;
        if (body.description !== undefined) updates.description = body.description;
        if (body.price !== undefined) updates.price = normalizePrice(body.price);
        if (body.featured !== undefined) updates.featured = Boolean(body.featured);
        if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
        if (body.subcategoryId !== undefined) updates.subcategoryId = body.subcategoryId;
        const [row] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
        return row ? json(row) : json({ error: "Not found" }, 404);
      }
      if (method === "DELETE" && Number.isInteger(id)) {
        await deletePhotosForProduct(id);
        await db.delete(products).where(eq(products.id, id));
        return json({ ok: true });
      }
    }

    // ---------- Photos ----------
    if (resource === "photos") {
      // POST /api/admin/photos/:id/default — mark a photo as the default.
      if (method === "POST" && Number.isInteger(id) && action === "default") {
        const [pic] = await db.select().from(photos).where(eq(photos.id, id));
        if (!pic) return json({ error: "Not found" }, 404);
        await db.update(photos).set({ isDefault: false }).where(eq(photos.productId, pic.productId));
        await db.update(photos).set({ isDefault: true }).where(eq(photos.id, id));
        return json({ ok: true });
      }

      // POST /api/admin/photos — upload a new image to Netlify Blobs.
      if (method === "POST" && !idPart) {
        if (!body.productId || !body.dataBase64)
          return json({ error: "productId and dataBase64 are required" }, 400);
        const [prod] = await db.select().from(products).where(eq(products.id, body.productId));
        if (!prod) return json({ error: "Product not found" }, 404);

        const bytes = Buffer.from(body.dataBase64, "base64");
        const blobKey = `${body.productId}/${crypto.randomUUID()}`;
        const store = getStore(PHOTO_STORE);
        await store.set(blobKey, bytes);

        const siblings = await db.select().from(photos).where(eq(photos.productId, body.productId));
        const nextOrder = siblings.reduce((m, p) => Math.max(m, p.sortOrder + 1), 0);

        const [row] = await db
          .insert(photos)
          .values({
            productId: body.productId,
            blobKey,
            contentType: body.contentType || "application/octet-stream",
            filaments: Array.isArray(body.filaments) && body.filaments.length ? body.filaments : null,
            texture: body.texture || null,
            isDefault: siblings.length === 0,
            sortOrder: nextOrder,
          })
          .returning();
        return json({ ...row, url: `/api/photos/${row.id}` }, 201);
      }

      if (method === "PATCH" && Number.isInteger(id)) {
        const updates: Record<string, unknown> = {};
        if (body.filaments !== undefined)
          updates.filaments = Array.isArray(body.filaments) && body.filaments.length ? body.filaments : null;
        if (body.texture !== undefined) updates.texture = body.texture || null;
        if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
        const [row] = await db.update(photos).set(updates).where(eq(photos.id, id)).returning();
        return row ? json(row) : json({ error: "Not found" }, 404);
      }

      if (method === "DELETE" && Number.isInteger(id)) {
        const [pic] = await db.select().from(photos).where(eq(photos.id, id));
        if (!pic) return json({ error: "Not found" }, 404);
        if (pic.blobKey) {
          await getStore(PHOTO_STORE).delete(pic.blobKey);
        }
        await db.delete(photos).where(eq(photos.id, id));
        // If we removed the default, promote the next remaining photo.
        if (pic.isDefault) {
          const [next] = await db
            .select()
            .from(photos)
            .where(eq(photos.productId, pic.productId))
            .orderBy(asc(photos.sortOrder), asc(photos.id));
          if (next) await db.update(photos).set({ isDefault: true }).where(eq(photos.id, next.id));
        }
        return json({ ok: true });
      }
    }

    // ---------- Filaments (public colour library) ----------
    if (resource === "filaments") {
      // GET /api/admin/filaments — full list for the management UI.
      if (method === "GET") {
        return json(await listFilaments());
      }
      // POST /api/admin/filaments/:id/reorder — move a colour up or down within
      // its own stock-status group. Renumbers the whole list densely so the
      // swap always takes effect even when older rows share sortOrder 0.
      if (method === "POST" && Number.isInteger(id) && action === "reorder") {
        const dir = body.direction;
        if (dir !== "up" && dir !== "down")
          return json({ error: "direction must be 'up' or 'down'" }, 400);
        const all = await db
          .select()
          .from(filaments)
          .orderBy(asc(filaments.sortOrder), asc(filaments.id));
        const current = all.find((f) => f.id === id);
        if (!current) return json({ error: "Not found" }, 404);
        const group = all.filter((f) => f.status === current.status);
        const idx = group.findIndex((f) => f.id === id);
        const swapWith = dir === "up" ? group[idx - 1] : group[idx + 1];
        if (swapWith) {
          const orderIds = all.map((f) => f.id);
          const a = orderIds.indexOf(current.id);
          const b = orderIds.indexOf(swapWith.id);
          [orderIds[a], orderIds[b]] = [orderIds[b], orderIds[a]];
          await Promise.all(
            orderIds.map((fid, i) =>
              db.update(filaments).set({ sortOrder: i }).where(eq(filaments.id, fid)),
            ),
          );
        }
        return json({ ok: true });
      }
      if (method === "POST" && !idPart) {
        if (!body.name) return json({ error: "name is required" }, 400);
        const existing = await db.select({ sortOrder: filaments.sortOrder }).from(filaments);
        const nextOrder = existing.reduce((m, f) => Math.max(m, f.sortOrder + 1), 0);
        const [row] = await db
          .insert(filaments)
          .values({
            name: String(body.name).trim(),
            material: body.material ? String(body.material).trim() : "",
            finish: normalizeFinish(body.finish),
            hex: normalizeHex(body.hex),
            hex2: normalizeOptionalHex(body.hex2),
            colors: normalizeColors(body.colors),
            status: normalizeStatus(body.status),
            sortOrder: nextOrder,
          })
          .returning();
        return json(row, 201);
      }
      if (method === "PATCH" && Number.isInteger(id)) {
        const updates: Record<string, unknown> = {};
        if (body.name !== undefined) updates.name = String(body.name).trim();
        if (body.material !== undefined) updates.material = String(body.material).trim();
        if (body.finish !== undefined) updates.finish = normalizeFinish(body.finish);
        if (body.hex !== undefined) updates.hex = normalizeHex(body.hex);
        if (body.hex2 !== undefined) updates.hex2 = normalizeOptionalHex(body.hex2);
        if (body.colors !== undefined) updates.colors = normalizeColors(body.colors);
        if (body.status !== undefined) updates.status = normalizeStatus(body.status);
        if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
        const [row] = await db.update(filaments).set(updates).where(eq(filaments.id, id)).returning();
        return row ? json(row) : json({ error: "Not found" }, 404);
      }
      if (method === "DELETE" && Number.isInteger(id)) {
        await deletePrintsForFilament(id);
        await db.delete(filaments).where(eq(filaments.id, id));
        return json({ ok: true });
      }
    }

    // ---------- Filament print photos (example prints per colour) ----------
    if (resource === "filament-photos") {
      // POST /api/admin/filament-photos — upload a print image to Netlify Blobs.
      if (method === "POST" && !idPart) {
        if (!body.filamentId || !body.dataBase64)
          return json({ error: "filamentId and dataBase64 are required" }, 400);
        const [fil] = await db.select().from(filaments).where(eq(filaments.id, body.filamentId));
        if (!fil) return json({ error: "Filament not found" }, 404);

        const bytes = Buffer.from(body.dataBase64, "base64");
        const blobKey = `${body.filamentId}/${crypto.randomUUID()}`;
        const store = getStore(FILAMENT_PHOTO_STORE);
        await store.set(blobKey, bytes);

        const siblings = await db
          .select()
          .from(filamentPhotos)
          .where(eq(filamentPhotos.filamentId, body.filamentId));
        const nextOrder = siblings.reduce((m, p) => Math.max(m, p.sortOrder + 1), 0);

        const [row] = await db
          .insert(filamentPhotos)
          .values({
            filamentId: body.filamentId,
            blobKey,
            contentType: body.contentType || "application/octet-stream",
            caption: body.caption ? String(body.caption).trim() : null,
            sortOrder: nextOrder,
          })
          .returning();
        return json({ ...row, url: `/api/filament-photos/${row.id}` }, 201);
      }

      // PATCH /api/admin/filament-photos/:id — edit a print's caption.
      if (method === "PATCH" && Number.isInteger(id)) {
        const updates: Record<string, unknown> = {};
        if (body.caption !== undefined) updates.caption = body.caption ? String(body.caption).trim() : null;
        if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
        const [row] = await db
          .update(filamentPhotos)
          .set(updates)
          .where(eq(filamentPhotos.id, id))
          .returning();
        return row ? json(row) : json({ error: "Not found" }, 404);
      }

      if (method === "DELETE" && Number.isInteger(id)) {
        const [pic] = await db.select().from(filamentPhotos).where(eq(filamentPhotos.id, id));
        if (!pic) return json({ error: "Not found" }, 404);
        if (pic.blobKey) {
          await getStore(FILAMENT_PHOTO_STORE).delete(pic.blobKey);
        }
        await db.delete(filamentPhotos).where(eq(filamentPhotos.id, id));
        return json({ ok: true });
      }
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error("Admin API error", err);
    return json({ error: "Internal error" }, 500);
  }
};

function normalizePrice(price: unknown): string {
  const n = Number(price);
  if (!Number.isFinite(n) || n < 0) return "0.00";
  return n.toFixed(2);
}

// Blob cleanup helpers — remove uploaded files before their DB rows cascade away.
async function deleteBlobsForProductIds(productIds: number[]) {
  if (productIds.length === 0) return;
  const store = getStore(PHOTO_STORE);
  const pics = await db.select().from(photos);
  await Promise.all(
    pics
      .filter((p) => productIds.includes(p.productId) && p.blobKey)
      .map((p) => store.delete(p.blobKey as string)),
  );
}

async function deletePhotosForProduct(productId: number) {
  await deleteBlobsForProductIds([productId]);
}

async function deletePhotosForSubcategory(subcategoryId: number) {
  const prods = await db.select({ id: products.id }).from(products).where(eq(products.subcategoryId, subcategoryId));
  await deleteBlobsForProductIds(prods.map((p) => p.id));
}

async function deletePhotosForCategory(categoryId: number) {
  const subs = await db.select({ id: subcategories.id }).from(subcategories).where(eq(subcategories.categoryId, categoryId));
  for (const sub of subs) await deletePhotosForSubcategory(sub.id);
}

// Remove the blobs backing a filament's print gallery before its rows cascade.
async function deletePrintsForFilament(filamentId: number) {
  const pics = await db
    .select()
    .from(filamentPhotos)
    .where(eq(filamentPhotos.filamentId, filamentId));
  if (pics.length === 0) return;
  const store = getStore(FILAMENT_PHOTO_STORE);
  await Promise.all(pics.filter((p) => p.blobKey).map((p) => store.delete(p.blobKey as string)));
}

export const config: Config = {
  path: "/api/admin/*",
};
