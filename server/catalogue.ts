import { asc, desc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { categories, subcategories, products, photos } from "../db/schema.js";
// Bundled snapshot of the original filesystem catalogue. Used only to seed an
// empty database the first time the API runs, so existing products survive the
// move from the static build to the database.
import catalogueSeed from "../src/data/catalogue.json" with { type: "json" };

/** Turn a display name into a URL-safe slug used in the public hash routes. */
export function slugify(input: string): string {
  const base = input
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "item";
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

  const tree: Record<string, any> = {};
  for (const cat of cats) {
    tree[cat.slug] = {
      id: cat.slug,
      displayName: cat.displayName,
      theme: { themeColor: cat.themeColor },
      subCategories: {},
    };
  }

  const subById: Record<number, { catSlug: string; slug: string }> = {};
  for (const sub of subs) {
    const cat = cats.find((c) => c.id === sub.categoryId);
    if (!cat) continue;
    subById[sub.id] = { catSlug: cat.slug, slug: sub.slug };
    tree[cat.slug].subCategories[sub.slug] = {
      id: sub.slug,
      displayName: sub.displayName,
      products: {},
    };
  }

  const prodById: Record<number, { catSlug: string; subSlug: string; slug: string }> = {};
  for (const prod of prods) {
    const loc = subById[prod.subcategoryId];
    if (!loc) continue;
    prodById[prod.id] = { catSlug: loc.catSlug, subSlug: loc.slug, slug: prod.slug };
    tree[loc.catSlug].subCategories[loc.slug].products[prod.slug] = {
      id: prod.slug,
      displayName: prod.displayName,
      description: prod.description,
      featured: prod.featured,
      price: prod.price,
      photos: [],
    };
  }

  for (const pic of pics) {
    const loc = prodById[pic.productId];
    if (!loc) continue;
    const photo: Record<string, any> = { url: photoUrl(pic) };
    if (pic.filaments) photo.filaments = pic.filaments;
    if (pic.texture) photo.texture = pic.texture;
    tree[loc.catSlug].subCategories[loc.subSlug].products[loc.slug].photos.push(photo);
  }

  return tree;
}

/**
 * Seed the database from the bundled catalogue snapshot the first time it runs
 * against an empty database. Idempotent: does nothing once any category exists,
 * so admin edits are never overwritten.
 */
export async function ensureSeeded(): Promise<void> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(categories);
  if (count > 0) return;

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
}
