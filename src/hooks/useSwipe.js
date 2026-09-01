import { useEffect, useRef } from 'react';

/** How far a finger has to travel horizontally before it counts as a swipe. */
const MIN_DISTANCE = 45;
/**
 * How much more horizontal than vertical the movement has to be. Without this a
 * diagonal flick while scrolling the page would also change the photo.
 */
const DIRECTION_BIAS = 1.4;

/**
 * Horizontal swipe on a touch screen, for the two places on the site where a
 * photo is the content: the gallery on a product page and the print lightbox on
 * the Colours page. Both previously only advanced from a control — a 76px
 * thumbnail below the photo, or a pair of arrows that get pushed on top of the
 * image on a narrow screen — where swiping is what anyone holding a phone tries
 * first.
 *
 * Returns a ref to put on the element the gesture should be measured over.
 *
 * Both listeners are passive, so this can never delay or block a scroll: the
 * decision about whether a movement was a swipe is made after the finger lifts,
 * from where it started and where it ended, and a mostly-vertical movement is
 * left alone to have been the scroll it was.
 */
export function useSwipe({ onNext, onPrevious, enabled = true } = {}) {
  const targetRef = useRef(null);
  // Kept in a ref so changing handlers (they are recreated whenever the current
  // photo changes) does not tear the listeners off and re-attach them mid-touch.
  // Written from an effect rather than during render, which is where a ref is
  // allowed to be touched at all; a touch cannot be handled before the render
  // it belongs to has been painted, so the pair below is never stale.
  const handlers = useRef({ onNext, onPrevious });
  useEffect(() => {
    handlers.current = { onNext, onPrevious };
  });

  useEffect(() => {
    const el = targetRef.current;
    if (!el || !enabled) return undefined;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onTouchStart = (event) => {
      // A second finger means a pinch-zoom on the photo, which is not ours.
      tracking = event.touches.length === 1;
      if (!tracking) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    };

    const onTouchEnd = (event) => {
      if (!tracking) return;
      tracking = false;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) < MIN_DISTANCE) return;
      if (Math.abs(dx) < Math.abs(dy) * DIRECTION_BIAS) return;
      if (dx < 0) handlers.current.onNext?.();
      else handlers.current.onPrevious?.();
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled]);

  return targetRef;
}
