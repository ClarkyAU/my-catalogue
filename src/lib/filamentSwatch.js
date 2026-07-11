// Shared rendering of a filament's colour swatch, used by both the public
// Colours page and the admin portal so the two always look identical.

export const FILAMENT_FINISHES = ['Standard', 'Matte', 'Silk', 'Marble', 'Gradient'];

// Upper bound on how many colours a single gradient may blend. Kept in sync
// with the server's MAX_GRADIENT_COLORS.
export const MAX_GRADIENT_COLORS = 6;

// Order the storefront shows the stock groups in, most-available first.
export const STATUS_ORDER = ['In Stock', 'On Order', 'Out of Stock'];

// The ordered colour list a Gradient blends. Falls back to the primary colour
// plus the secondary (or a repeat of the primary) so a gradient always has at
// least two stops to blend.
export function gradientColors(filament) {
  const list = Array.isArray(filament.colors) ? filament.colors.filter(Boolean) : [];
  if (list.length >= 2) return list;
  const hex = filament.hex || '#000000';
  return [hex, filament.hex2 || hex];
}

// Builds an inline style object representing the finish:
// - Standard / Matte: a flat fill.
// - Silk: a soft diagonal sheen over the colour.
// - Marble: small speckles of the second colour scattered over the base.
// - Gradient: the ordered colours blended horizontally, left to right.
export function swatchStyle(filament) {
  const hex = filament.hex || '#000000';
  switch (filament.finish) {
    case 'Gradient': {
      const stops = gradientColors(filament).join(', ');
      return { background: `linear-gradient(90deg, ${stops})` };
    }
    case 'Marble': {
      const dot = filament.hex2 || '#ffffff';
      return {
        backgroundColor: hex,
        backgroundImage: `radial-gradient(circle, ${dot} 1.6px, transparent 2px), radial-gradient(circle, ${dot} 1.6px, transparent 2px)`,
        backgroundSize: '9px 9px',
        backgroundPosition: '0 0, 4.5px 4.5px',
      };
    }
    case 'Silk':
      return {
        background: `linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 45%), ${hex}`,
      };
    case 'Matte':
    case 'Standard':
    default:
      return { background: hex };
  }
}
