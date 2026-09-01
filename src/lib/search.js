import { firstPhotoUrl } from './photos.js';

/**
 * Catalogue search, run entirely in the browser.
 *
 * The only way into the catalogue used to be the cascade menu, which asks the
 * visitor to already know which category a print lives under and costs two or
 * three taps to find out. That is worst on a phone, where the menu is also the
 * widest thing on the screen. The whole catalogue is already in memory after
 * /api/bootstrap, so searching it needs no request and no backend — which is why
 * this is a plain function over the tree rather than an endpoint.
 */

/** Flatten the category → sub-category → product tree into one list of leaves. */
export function flattenCatalogue(catalogue) {
  const out = [];
  Object.entries(catalogue || {}).forEach(([catId, category]) => {
    Object.entries(category.subCategories || {}).forEach(([subId, sub]) => {
      Object.entries(sub.products || {}).forEach(([prodId, product]) => {
        out.push({
          path: `${catId}/${subId}/${prodId}`,
          name: product.displayName || '',
          categoryName: category.displayName || '',
          subCategoryName: sub.displayName || '',
          description: product.description || '',
          price: product.price,
          photo: firstPhotoUrl(product),
        });
      });
    });
  });
  return out;
}

// What a match is worth, best first. A name is what someone is typing; where the
// print lives is a useful second guess ("vial" finding everything in Vial
// Storage); the description is a last resort so a word buried in a paragraph
// never outranks a name.
const NAME_PREFIX = 100;
const NAME_WORD = 70;
const NAME_ANYWHERE = 50;
const PLACE = 25;
const DESCRIPTION = 8;

const norm = (s) => s.toLowerCase().trim();

/** Score one entry against one already-lowercased token, or 0 for no match. */
function scoreToken(entry, token) {
  const name = norm(entry.name);
  if (name.startsWith(token)) return NAME_PREFIX;
  if (name.split(/\s+/).some((word) => word.startsWith(token))) return NAME_WORD;
  if (name.includes(token)) return NAME_ANYWHERE;
  if (norm(entry.categoryName).includes(token) || norm(entry.subCategoryName).includes(token)) {
    return PLACE;
  }
  if (norm(entry.description).includes(token)) return DESCRIPTION;
  return 0;
}

/**
 * Rank `entries` against a query. Every whitespace-separated word has to match
 * something, so adding a word narrows the list rather than widening it — which
 * is what someone typing a second word is trying to do.
 */
export function searchCatalogue(entries, query, limit = 30) {
  const tokens = norm(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const scored = [];
  for (const entry of entries) {
    let total = 0;
    let matchedAll = true;
    for (const token of tokens) {
      const score = scoreToken(entry, token);
      if (score === 0) {
        matchedAll = false;
        break;
      }
      total += score;
    }
    if (matchedAll) scored.push({ entry, score: total });
  }

  // Ties broken by name, so the order of two equally good matches is stable and
  // does not depend on where they happened to sit in the tree.
  scored.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name));
  return scored.slice(0, limit).map((s) => s.entry);
}
