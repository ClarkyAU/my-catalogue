import { asc, desc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { categories, subcategories, products, photos } from "../db/schema.js";
// Frozen snapshot of the original filesystem catalogue. Used only to seed an
// empty database the first time the API runs, so existing products survive the
// move from the static build to the database. Never read at request time.
import catalogueSeed from "../src/data/seed.json" with { type: "json" };

/** Turn a display name into a URL-safe slug used in the public hash routes. */
export function slugify(input: string): string {
  const base = input
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "item";
}

// A print with more separately-coloured parts than this is a conversation, not
// a form; the storefront has to ask about every one of them before ordering.
export const MAX_COLOUR_PARTS = 8;
const MAX_PART_NAME = 40;

/**
 * Clean the list of separately-colourable parts an owner typed in. Blank rows
 * are dropped and a name repeated by accident is only kept once, so the
 * storefront never asks the same question twice. Returns null for a product
 * printed in a single colour.
 */
export function normalizeColourParts(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    const name = String(raw ?? "").trim().slice(0, MAX_PART_NAME);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    parts.push(name);
    if (parts.length === MAX_COLOUR_PARTS) break;
  }
  return parts.length > 0 ? parts : null;
}

/** Public URL for a photo row (Blobs-backed uploads vs. carried-over statics). */
function photoUrl(row: { id: number; blobKey: string | null; staticUrl: string | null }): string {
  if (row.blobKey) return `/api/photos/${row.id}`;
  return row.staticUrl || "";
}

/**
 * Read the whole catalogue from the database and shape it into the nested,
 * slug-keyed object the public React app already expects.
 */
export async function buildCatalogue() {
  const [cats, subs, prods, pics] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id)),
    db.select().from(subcategories).orderBy(asc(subcategories.sortOrder), asc(subcategories.id)),
    db.select().from(products).orderBy(asc(products.sortOrder), asc(products.id)),
    db
      .select()
      .from(photos)
      .orderBy(desc(photos.isDefault), asc(photos.sortOrder), asc(photos.id)),
  ]);

  const catBySlug = new Map<number, string>();
  const tree: Record<string, any> = {};
  for (const cat of cats) {
    catBySlug.set(cat.id, cat.slug);
    tree[cat.slug] = {
      id: cat.slug,
      displayName: cat.displayName,
      theme: { themeColor: cat.themeColor },
      subCategories: {},
    };
  }

  const subById = new Map<number, { catSlug: string; slug: string }>();
  for (const sub of subs) {
    const catSlug = catBySlug.get(sub.categoryId);
    if (!catSlug) continue;
    subById.set(sub.id, { catSlug, slug: sub.slug });
    tree[catSlug].subCategories[sub.slug] = {
      id: sub.slug,
      displayName: sub.displayName,
      products: {},
    };
  }

  const prodById = new Map<number, { catSlug: string; subSlug: string; slug: string }>();
  for (const prod of prods) {
    // Listings hidden from the store are left out of the public catalogue
    // altogether, so they vanish from the menu, grids and Featured Items.
    if (prod.hidden) continue;
    const loc = subById.get(prod.subcategoryId);
    if (!loc) continue;
    prodById.set(prod.id, { catSlug: loc.catSlug, subSlug: loc.slug, slug: prod.slug });
    const listing: Record<string, any> = {
      id: prod.slug,
      displayName: prod.displayName,
      description: prod.description,
      featured: prod.featured,
      badge: prod.badge,
      price: prod.price,
      photos: [],
    };
    // Only sent for prints that actually have separately-coloured parts, so a
    // single-colour listing stays exactly the shape it was.
    const parts = normalizeColourParts(prod.colourParts);
    if (parts) listing.colourParts = parts;
    tree[loc.catSlug].subCategories[loc.slug].products[prod.slug] = listing;
  }

  for (const pic of pics) {
    const loc = prodById.get(pic.productId);
    if (!loc) continue;
    const photo: Record<string, any> = { url: photoUrl(pic) };
    if (pic.filaments) photo.filaments = pic.filaments;
    if (pic.texture) photo.texture = pic.texture;
    tree[loc.catSlug].subCategories[loc.subSlug].products[loc.slug].photos.push(photo);
  }

  return tree;
}

// Seeding only ever needs to happen once per container. Remembering that we
// already checked saves a `count(*)` on every single catalogue request.
let seedChecked = false;

/**
 * Seed the database from the frozen catalogue snapshot the first time it runs
 * against an empty database. Idempotent: does nothing once any category exists,
 * so admin edits are never overwritten.
 */
export async function ensureSeeded(): Promise<void> {
  if (seedChecked) return;
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(categories);
  if (count > 0) {
    seedChecked = true;
    return;
  }

  let catOrder = 0;
  for (const [catSlug, cat] of Object.entries(catalogueSeed as Record<string, any>)) {
    const [insertedCat] = await db
      .insert(categories)
      .values({
        slug: catSlug,
        displayName: cat.displayName || catSlug,
        themeColor: cat.theme?.themeColor || "#00E5FF",
        sortOrder: catOrder++,
      })
      .returning();

    let subOrder = 0;
    for (const [subSlug, sub] of Object.entries(cat.subCategories || {}) as [string, any][]) {
      const [insertedSub] = await db
        .insert(subcategories)
        .values({
          categoryId: insertedCat.id,
          slug: subSlug,
          displayName: sub.displayName || subSlug,
          sortOrder: subOrder++,
        })
        .returning();

      let prodOrder = 0;
      for (const [prodSlug, prod] of Object.entries(sub.products || {}) as [string, any][]) {
        const [insertedProd] = await db
          .insert(products)
          .values({
            subcategoryId: insertedSub.id,
            slug: prodSlug,
            displayName: prod.displayName || prodSlug,
            description: prod.description || "",
            price: prod.price || "0.00",
            featured: Boolean(prod.featured),
            sortOrder: prodOrder++,
          })
          .returning();

        const photoRows = (prod.photos || []).map((p: any, i: number) => ({
          productId: insertedProd.id,
          staticUrl: typeof p === "string" ? p : p.url,
          filaments: p.filaments || null,
          texture: p.texture || null,
          isDefault: i === 0,
          sortOrder: i,
        }));
        if (photoRows.length > 0) {
          await db.insert(photos).values(photoRows);
        }
      }
    }
  }

  seedChecked = true;
}
