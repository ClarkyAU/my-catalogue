import { useEffect, useRef } from 'react';

// Anything a keyboard can land on. Elements the browser has taken out of the tab
// order themselves (disabled, tabindex="-1") are left out.
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Keep keyboard focus inside a modal while it is open, and hand it back
 * afterwards.
 *
 * Without this, Tab walks straight out of an overlay into the catalogue behind
 * it: the page under the panel is still there, still focusable, and a screen
 * reader user has no way of knowing they have left the dialog. On close, focus
 * returns to whatever opened it, so the next Tab carries on from where the
 * visitor actually was rather than from the top of the document.
 *
 * Returns a ref to put on the dialog element. Give that element tabIndex={-1} so
 * there is somewhere to focus in the rare case it holds no controls at all.
 */
export function useFocusTrap(active) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    // Read before moving focus, so this is the element that opened the dialog.
    const restoreTo = document.activeElement;

    // Recomputed on every Tab rather than cached: a cart line can be removed and
    // the colour picker's list opens and closes while the panel is up, so the
    // first and last focusable elements are not fixed.
    const focusable = () =>
      Array.from(container.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
      );

    if (!container.contains(document.activeElement)) {
      (focusable()[0] || container).focus();
    }

    // Capture phase, on the document: the point is to catch Tab even when focus
    // has somehow ended up outside the dialog, which is exactly when a listener
    // bound to the dialog itself would never fire.
    const onKeyDown = (event) => {
      if (event.key !== 'Tab') return;

      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];

      if (!container.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      // The opener may itself have been removed by whatever happened in the
      // dialog, in which case there is nothing sensible to return to.
      if (restoreTo instanceof HTMLElement && document.contains(restoreTo)) {
        restoreTo.focus();
      }
    };
  }, [active]);

  return containerRef;
}
