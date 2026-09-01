import { useCallback, useEffect, useState } from 'react';

/**
 * Open/close state for a full-screen overlay, wired into session history so the
 * platform's own dismiss gesture works on it.
 *
 * The cart and the print lightbox were plain component state, which meant the
 * Android back button and the iOS back-swipe left the storefront entirely
 * instead of closing the panel in front of it — the first thing anyone reaches
 * for to dismiss something that covers the screen. Opening now adds a history
 * entry and going back pops it, so back closes the overlay and a second back
 * leaves the page, which is what both platforms lead people to expect.
 *
 * The push and the pop live in the open/close callbacks rather than in an effect
 * on purpose: they are one-off consequences of a gesture, not state to keep in
 * sync, and running them from an effect would fire them twice under StrictMode.
 *
 * `value` is whatever was passed to `open()` — `true` for a panel that is just
 * open or shut, or an object for one that has to remember what it is showing.
 */
export function useOverlay(key) {
  const [value, setValue] = useState(null);

  const open = useCallback((next = true) => {
    window.history.pushState({ overlay: key }, '');
    setValue(next);
  }, [key]);

  const close = useCallback(() => {
    setValue(null);
    // Retire the entry we added, so closing with the ✕ does not leave a dead
    // back press behind it. Guarded on our own marker: if anything else has
    // pushed since, that entry is not ours to pop.
    if (window.history.state?.overlay === key) window.history.back();
  }, [key]);

  // For closing on the way somewhere else — following a link out of the cart or
  // the search results. The navigation pushes its own entry, and going back is
  // asynchronous, so calling close() here would race the two and could undo the
  // navigation the visitor just asked for. The entry we added is left in place
  // instead: it holds the route they came from, which is where back should go.
  const dismiss = useCallback(() => setValue(null), []);

  useEffect(() => {
    if (value === null) return undefined;
    // Reached by going back, so the entry is already gone — just close.
    const onPop = () => setValue(null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [value]);

  return { value, open, close, dismiss, update: setValue, isOpen: value !== null };
}
