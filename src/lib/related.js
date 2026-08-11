// Picks the products to show under a product page as "more like this".
//
// Similarity is taken from where the owner filed things rather than guessed at:
// the same sub-category is the same shelf, so those come first, and the rest of
// the category tops the row up when a shelf is nearly empty. It deliberately
// never reaches into another category — a travel case and a keyring are not
// alternatives to each other, and a row of unrelated prints is worse than a
// short row or none at all.
//
// Order within each bucket is the catalogue's own, which is the order the owner
// arranged in the admin portal.

// One full row at the widest layout, matching the section strips elsewhere.
const LIMIT = 4;

/**
 * @returns {{ items: Array<{key: string, product: object, href: string, subName: string}>,
 *             scope: 'sub' | 'category' | null }}
 *   `scope` says how wide the net was actually cast, so the heading can name the
 *   right thing: 'sub' when everything shown is off the same shelf, 'category'
 *   when the row had to be topped up, and null when there is nothing to show.
 */
export function relatedProducts(catalogue, categoryId, subCategoryId, productId, limit = LIMIT) {
  const category = catalogue?.[categoryId];
  if (!category) return { items: [], scope: null };

  const subCategories = category.subCategories || {};

  // Keyed rather than read off product.id: the key is what the router resolves a
  // URL against, so it is what the link has to be built from.
  const from = (subId, sub) =>
    Object.entries(sub?.products || {})
      .filter(([key]) => !(subId === subCategoryId && key === productId))
      .map(([key, product]) => ({
        key: `${subId}/${key}`,
        product,
        href: `#${categoryId}/${subId}/${key}`,
        subName: sub.displayName,
      }));

  const items = from(subCategoryId, subCategories[subCategoryId]).slice(0, limit);
  const fromSameShelf = items.length;

  if (items.length < limit) {
    for (const [subId, sub] of Object.entries(subCategories)) {
      if (subId === subCategoryId) continue;
      for (const entry of from(subId, sub)) {
        if (items.length >= limit) break;
        items.push(entry);
      }
      if (items.length >= limit) break;
    }
  }

  if (items.length === 0) return { items: [], scope: null };
  return { items, scope: items.length > fromSameShelf ? 'category' : 'sub' };
}
