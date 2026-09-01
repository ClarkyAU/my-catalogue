/**
 * URL of a product's first (default) photo. The API sends photo objects, but
 * older bundled data used bare URL strings, so both shapes are accepted.
 * Returns null when a product has no photos yet.
 */
export const firstPhotoUrl = (product) => product?.photos?.[0]?.url || product?.photos?.[0] || null;

// Photos are stored at whatever size they were uploaded at (up to MAX_SOURCE_WIDTH),
// but most of the storefront shows them at a few hundred pixels. Sending the
// original to fill a 280px thumbnail wastes most of the bytes downloaded, so
// every <img> goes through the Netlify Image CDN, which resizes at the edge and
// caches the result. Both photo sources are same-origin paths — uploads served
// by /api/photos/:id and the images carried over from the static site under
// /products/ — so neither needs a `remote_images` allowlist in netlify.toml.
//
// `fm` is deliberately never set here: with no explicit format the CDN reads the
// browser's Accept header and serves WebP where it is supported, falling back to
// the original format where it is not. (The one place that does ask for a format
// is the product page's main photo, which offers AVIF through a <picture> —
// see avifUrl below.)

/**
 * The widest the stored original can be. Uploads are downscaled in the browser
 * to this before they are ever sent (see src/admin/image.js), so asking the
 * Image CDN for anything larger buys no extra detail — it just upscales, which
 * costs a fresh edge transform and more bytes for a blurrier picture. Every
 * width requested from here is clamped to it.
 */
export const MAX_SOURCE_WIDTH = 1600;

/**
 * Transformed URL for one of our own images. `w`/`h` are the pixels the image
 * is actually displayed at; `fit` only applies when both are given (the CDN
 * needs both dimensions to know what to crop). Anything that is not a
 * same-origin path — an absolute URL, or a missing photo — is passed straight
 * back untouched.
 */
export function imageUrl(url, { w, h, fit = 'cover', fm } = {}) {
  if (typeof url !== 'string' || !url.startsWith('/')) return url || null;
  const params = new URLSearchParams({ url });
  const width = w ? Math.min(Math.round(w), MAX_SOURCE_WIDTH) : undefined;
  const height = h ? Math.min(Math.round(h), MAX_SOURCE_WIDTH) : undefined;
  if (width) params.set('w', String(width));
  if (height) params.set('h', String(height));
  if (width && height) params.set('fit', fit);
  if (fm) params.set('fm', fm);
  return `/.netlify/images?${params}`;
}

/**
 * A 1x/2x `srcset` for an image shown at a genuinely fixed size — the gallery
 * thumbs, the cart line thumbs, the little example prints on the Colours page.
 * Density descriptors are the right tool only when the CSS pins the box to one
 * width at every viewport, because the browser picks between them on pixel
 * ratio alone and never looks at how wide the image landed.
 */
export function srcSetDensity(url, { w, h, fit = 'cover' } = {}) {
  if (typeof url !== 'string' || !url.startsWith('/')) return undefined;
  const seen = new Set();
  return [1, 2]
    .map((density) => {
      const width = Math.min(w * density, MAX_SOURCE_WIDTH);
      // Past the stored original's width both densities clamp to the same URL,
      // and a srcset offering one candidate twice is just a bigger attribute.
      if (seen.has(width)) return null;
      seen.add(width);
      const scaled = imageUrl(url, { w: width, h: h ? h * density : undefined, fit });
      return `${scaled} ${density}x`;
    })
    .filter(Boolean)
    .join(', ');
}

/**
 * The three fluid images on the site, each as the ladder of real widths the CDN
 * should be asked for plus the `sizes` that tells the browser how wide the image
 * will actually land.
 *
 * This pairing is the whole point. These images are laid out in fractions of the
 * viewport, not at a fixed size, so the old 1x/2x density srcset made the
 * browser choose purely on pixel ratio: a phone at 2x downloaded the 2x
 * candidate — over 1100px wide — to fill a card barely 180px across, roughly six
 * times the bytes needed, eleven times over on the landing page. Width
 * descriptors plus `sizes` let it do the arithmetic properly and take the
 * smallest candidate that still covers the box at its density.
 *
 * The `sizes` values are derived from the real layout in src/styles/global.css:
 * `.main-wrapper` is capped at 1400px with 20px of padding, `.product-grid`
 * drops to two columns at 768px and one at 480px, and `.split` becomes a single
 * column at 960px. They are rounded slightly generously — being a little high
 * costs a few bytes, being low costs a visibly soft image.
 */

/**
 * Product cards, in the featured grid and every category grid.
 *
 * There are two of these because the card frame is not the same shape at every
 * width: `.card-img-container` is a square on a laptop and 3:2 on a phone. One
 * square preset for both meant the CDN cropped the original to a square and then
 * CSS cropped that square again to 3:2, discarding a third of the height — bytes
 * paid for and never seen, and a tall print could lose its top and bottom on a
 * phone in a way that never showed up on the owner's laptop. CardImage picks
 * between them with a <picture> media source.
 *
 * The desktop `sizes` is stepped rather than a single figure because the grid is
 * `auto-fill minmax(270px, 1fr)`: a card is at its widest (~370px) at around
 * 800px and 1160px of viewport, where the track count has just dropped, and at
 * its narrowest (~320px) once the wrapper hits its 1400px cap. One value for the
 * whole range has to cover the worst case, so the wide desktops paid for it.
 */
export const CARD_IMAGE = {
  widths: [240, 320, 420, 560, 640, 840],
  sizes: '(max-width: 1199px) 380px, 340px',
  ratio: 1,
  // What a browser that ignores srcset/sizes gets, and what `src` points at.
  fallbackWidth: 560,
};

/** The same cards below 768px, where the frame is 3:2 and there are two per row. */
export const CARD_IMAGE_WIDE = {
  widths: [240, 320, 420, 560, 640, 840],
  sizes: '(max-width: 480px) calc(100vw - 40px), calc(50vw - 26px)',
  ratio: 2 / 3,
  fallbackWidth: 560,
  media: '(max-width: 768px)',
};

/**
 * The main photo on a product page: fills its column, keeps its own ratio.
 *
 * The first entry is not about width at all. The photo is capped at 78dvh (see
 * `.main-img`) so that a phone held sideways — or a short laptop window — shows
 * the whole print instead of a band across the middle of it. When that cap is
 * what decides the size, the height is the useful hint: without it a landscape
 * phone would declare a ~736px slot and fetch four times the pixels it can
 * actually show.
 */
export const MAIN_IMAGE = {
  widths: [400, 610, 800, 1000, 1220, MAX_SOURCE_WIDTH],
  sizes: '(orientation: landscape) and (max-height: 620px) 78vh, (max-width: 960px) calc(100vw - 108px), 610px',
  fallbackWidth: 1000,
};

/** The Colours page lightbox, which opens at 90% of the viewport. */
export const LIGHTBOX_IMAGE = {
  widths: [600, 900, 1200, MAX_SOURCE_WIDTH],
  sizes: '90vw',
  fallbackWidth: 1200,
};

/**
 * Everything an `<img>` needs for one of the fluid presets above, ready to
 * spread onto the element: `{ src, srcSet, sizes }`. Returns just a `src` for
 * anything the Image CDN cannot transform, so a caller never has to special-case
 * an absolute URL.
 */
export function responsiveImage(url, preset) {
  const { widths, sizes, ratio, fallbackWidth } = preset;
  // A preset with a ratio is displayed in a frame of a fixed shape, so the CDN
  // is asked to do the cropping once at the edge. Without one the photo keeps
  // whatever shape it was uploaded at.
  const at = (w) => (ratio ? { w, h: w * ratio, fit: 'cover' } : { w });
  const src = imageUrl(url, at(fallbackWidth));
  if (typeof url !== 'string' || !url.startsWith('/')) return { src };

  const candidates = [...new Set(widths.map((w) => Math.min(w, MAX_SOURCE_WIDTH)))]
    .sort((a, b) => a - b)
    .map((w) => `${imageUrl(url, at(w))} ${w}w`);

  return { src, srcSet: candidates.join(', '), sizes };
}

/**
 * The same preset encoded as AVIF, for use in a `<picture>` source ahead of the
 * default. AVIF is typically 20–30% smaller than the WebP the CDN negotiates on
 * its own, but it has to be asked for by name, and every extra format doubles the
 * set of edge transforms a photo can be asked for — each one paying a cold
 * transform the first time. So this is used on the product page's main photo
 * only: one image per page, the largest thing on it, and the place the saving is
 * actually worth the transform. Browsers without AVIF never request these.
 */
export function avifSrcSet(url, preset) {
  if (typeof url !== 'string' || !url.startsWith('/')) return undefined;
  const { widths, ratio } = preset;
  return [...new Set(widths.map((w) => Math.min(w, MAX_SOURCE_WIDTH)))]
    .sort((a, b) => a - b)
    .map((w) => {
      const box = ratio ? { w, h: w * ratio, fit: 'cover', fm: 'avif' } : { w, fm: 'avif' };
      return `${imageUrl(url, box)} ${w}w`;
    })
    .join(', ');
}
