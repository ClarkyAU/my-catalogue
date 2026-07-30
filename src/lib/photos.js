/**
 * URL of a product's first (default) photo. The API sends photo objects, but
 * older bundled data used bare URL strings, so both shapes are accepted.
 * Returns null when a product has no photos yet.
 */
export const firstPhotoUrl = (product) => product?.photos?.[0]?.url || product?.photos?.[0] || null;
