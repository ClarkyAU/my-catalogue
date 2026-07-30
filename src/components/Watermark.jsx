import { watermarkFor } from '../lib/watermark';

// The "NEW" / "POPULAR" mark drawn over a product's preview image on the
// Featured Items page. Sits inside a positioned image container and never
// intercepts clicks, so the whole card stays one link.
//
// It rides the active category's theme colour so it always matches the page it
// appears on; the "popular" mark uses the palette's warm accent so the two
// marks stay tellable apart at a glance.
export const Watermark = ({ product, settings }) => {
  const mark = watermarkFor(product, settings);
  if (!mark) return null;

  return (
    <span
      className={`watermark wm-${mark.style} wm-${mark.position} is-${mark.badge}`}
      style={{ '--wm-opacity': mark.opacity }}
      aria-hidden="true"
    >
      <span className="watermark-label">{mark.label.toUpperCase()}</span>
    </span>
  );
};
