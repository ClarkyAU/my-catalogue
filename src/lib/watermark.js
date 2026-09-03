// Shared watermark logic, used by the storefront's Featured Items page and by
// the admin portal's live preview so the two always agree on what a product's
// watermark will look like.

// Fallbacks matching the server's SETTINGS_DEFAULTS, so a watermark still
// renders sensibly before the settings API responds.
export const WATERMARK_DEFAULTS = {
  watermarkEnabled: 'true',
  watermarkNewLabel: 'NEW',
  watermarkPopularLabel: 'POPULAR',
  watermarkStyle: 'ribbon',
  watermarkPosition: 'top-left',
  watermarkOpacity: '0.9',
};

// The watermark treatments the owner can pick from in the admin portal.
export const WATERMARK_STYLES = [
  { value: 'ribbon', label: 'Corner ribbon' },
  { value: 'stamp', label: 'Diagonal stamp' },
  { value: 'tag', label: 'Pinned tag' },
];

// Which corner a ribbon or tag sits in. The centred stamp ignores this.
export const WATERMARK_POSITIONS = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-right', label: 'Bottom right' },
];

// The watermark a product can carry, as offered in the admin portal.
export const PRODUCT_BADGES = [
  { value: 'none', label: 'None' },
  { value: 'new', label: 'New' },
  { value: 'popular', label: 'Popular' },
];

const STYLE_VALUES = WATERMARK_STYLES.map((s) => s.value);
const POSITION_VALUES = WATERMARK_POSITIONS.map((p) => p.value);

const OPPOSITE_CORNER = {
  'top-left': 'bottom-right',
  'top-right': 'bottom-left',
  'bottom-left': 'top-right',
  'bottom-right': 'top-left',
};

/**
 * Resolve the watermark to draw over a product's preview image, or null when
 * the product carries no badge, the owner switched watermarks off, or the label
 * for that badge has been cleared.
 */
export function watermarkFor(product, settings) {
  const config = { ...WATERMARK_DEFAULTS, ...(settings || {}) };
  if (config.watermarkEnabled === 'false') return null;

  const badge = product?.badge;
  if (badge !== 'new' && badge !== 'popular') return null;

  const label = String(
    badge === 'new' ? config.watermarkNewLabel : config.watermarkPopularLabel,
  ).trim();
  if (!label) return null;

  const opacity = Number(config.watermarkOpacity);

  return {
    badge,
    label,
    style: STYLE_VALUES.includes(config.watermarkStyle)
      ? config.watermarkStyle
      : WATERMARK_DEFAULTS.watermarkStyle,
    position: POSITION_VALUES.includes(config.watermarkPosition)
      ? config.watermarkPosition
      : WATERMARK_DEFAULTS.watermarkPosition,
    opacity: Number.isFinite(opacity) ? Math.min(1, Math.max(0.2, opacity)) : 0.9,
  };
}

/**
 * Where to strike the "Clarky designed" seal on a product's image, or null for
 * everything Clarky did not design.
 *
 * The seal shares the photo with the New/Popular watermark, so the two are
 * placed together rather than left to land where they may: it takes the corner
 * opposite whichever one the owner set the watermark to, which is free in every
 * configuration — a ribbon or a tag occupies that one corner, and the diagonal
 * stamp keeps to the middle and leaves all four.
 *
 * Keyed to the site-wide setting rather than to this product's own badge on
 * purpose. The seal then sits in the same corner on every card in a grid,
 * whether or not the print next to it happens to be marked NEW, and still never
 * shares a corner with a watermark.
 */
export function designedMarkFor(product, settings) {
  if (!product?.clarkyDesigned) return null;

  const config = { ...WATERMARK_DEFAULTS, ...(settings || {}) };
  const watermarkCorner = POSITION_VALUES.includes(config.watermarkPosition)
    ? config.watermarkPosition
    : WATERMARK_DEFAULTS.watermarkPosition;

  return { position: OPPOSITE_CORNER[watermarkCorner] };
}
