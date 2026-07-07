import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { categories, subcategories, products, photos } from "../../db/schema.js";
import { requireAdmin } from "../../server/auth.js";
import { slugify } from "../../server/catalogue.js";

const PHOTO_STORE = "product-photos";

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

export const config: Config = {
  path: "/api/admin/*",
};
