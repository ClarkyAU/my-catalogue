// Every category picks its own theme colour in the admin portal, and the site
// fills buttons, badges and the cart count with it. Whatever sits ON that fill
// used to be a hardcoded #121212, which only works while the accent is light:
// Hotwheels red (#cc0000) lands at 3.2:1 against it and Pep Things purple
// (#8000ff) at 3.0:1, both under the 4.5:1 that small text asks for.
//
// So the ink is chosen from the accent instead — the page's near-black on a
// light accent, its cream on a dark one, whichever of the two the accent
// separates from more. The result is published as --on-accent and used
// everywhere an accent fill carries text.

// sRGB channel to linear light, per WCAG 2.x relative luminance.
const channel = (value) => {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance of a #rgb or #rrggbb colour. */
export function luminance(hex) {
  const clean = String(hex || '').trim().replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return 0;
  const n = parseInt(full, 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

/** Contrast ratio between two relative luminances. */
export const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

// The only two inks the site uses, so the choice is between these and not an
// arbitrary generated colour.
const DARK_INK = '#121212';
const LIGHT_INK = '#F5F0E6';
const DARK_L = luminance(DARK_INK);
const LIGHT_L = luminance(LIGHT_INK);

/** Which of the site's two inks reads better on a fill of `hex`. */
export function inkFor(hex) {
  const l = luminance(hex);
  return contrast(l, DARK_L) >= contrast(l, LIGHT_L) ? DARK_INK : LIGHT_INK;
}
