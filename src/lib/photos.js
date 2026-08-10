/**
 * URL of a product's first (default) photo. The API sends photo objects, but
 * older bundled data used bare URL strings, so both shapes are accepted.
 * Returns null when a product has no photos yet.
 */
export const firstPhotoUrl = (product) => product?.photos?.[0]?.url || product?.photos?.[0] || null;

// Photos are stored at whatever size they were uploaded at (up to 1600px), but
// most of the storefront shows them at a few hundred pixels. Sending the
// original to fill a 280px thumbnail wastes most of the bytes downloaded, so
// every <img> goes through the Netlify Image CDN, which resizes at the edge and
// caches the result. Both photo sources are same-origin paths — uploads served
// by /api/photos/:id and the images carried over from the static site under
// /products/ — so neither needs a `remote_images` allowlist in netlify.toml.
//
// `fm` is deliberately never set: with no explicit format the CDN reads the
// browser's Accept header and serves WebP or AVIF where they are supported,
// falling back to the original format where they are not.

/**
 * Transformed URL for one of our own images. `w`/`h` are the pixels the image
 * is actually displayed at; `fit` only applies when both are given (the CDN
 * needs both dimensions to know what to crop). Anything that is not a
 * same-origin path — an absolute URL, or a missing photo — is passed straight
 * back untouched.
 */
export function imageUrl(url, { w, h, fit = 'cover' } = {}) {
  if (typeof url !== 'string' || !url.startsWith('/')) return url || null;
  const params = new URLSearchParams({ url });
  if (w) params.set('w', String(Math.round(w)));
  if (h) params.set('h', String(Math.round(h)));
  if (w && h) params.set('fit', fit);
  return `/.netlify/images?${params}`;
}

/**
 * A 1x/2x `srcset` for an image shown at a fixed size, so retina screens get
 * the sharper copy and everyone else does not pay for it. Sizes are in CSS
 * pixels; `h` is optional for images that keep their own aspect ratio.
 */
export function srcSet(url, { w, h, fit = 'cover' } = {}) {
  if (typeof url !== 'string' || !url.startsWith('/')) return undefined;
  return [1, 2]
    .map((density) => {
      const scaled = imageUrl(url, { w: w * density, h: h ? h * density : undefined, fit });
      return `${scaled} ${density}x`;
    })
    .join(', ');
}
