// Some prints are assembled from pieces that each go through the printer on
// their own, so each one can be a different colour. The owner declares those
// pieces per product in the admin portal; the storefront then asks for a colour
// once per piece instead of once per product.

// Upper bound on how many separately-coloured parts one print may declare, and
// how long a part name may be. Kept in sync with the server's MAX_COLOUR_PARTS
// and MAX_PART_NAME in server/catalogue.ts.
export const MAX_COLOUR_PARTS = 8;
export const MAX_PART_NAME = 40;

/**
 * The parts a listing wants colours for. An empty list means the print is one
 * colour, which is the overwhelming majority of the catalogue.
 */
export function productParts(product) {
  const parts = product?.colourParts;
  return Array.isArray(parts) ? parts.filter((part) => typeof part === 'string' && part.trim()) : [];
}

/** True when two part lists would produce the same set of questions. */
export const samePartList = (a, b) =>
  a.length === b.length && a.every((part, i) => part === b[i]);
