import { useEffect, useRef } from 'react';

/**
 * Put a new route at the top of the page, and leave a revisited one where it was.
 *
 * Nothing did this. A category page stacks a strip per sub-category, so tapping a
 * product in the third strip opened the product page already scrolled past its
 * own photo — the related-products row carried a `scrollTo` of its own to patch
 * exactly that, and nowhere else did. Doing it in the router covers every link on
 * the site instead of the one that noticed.
 *
 * Back and forward are deliberately left alone: the browser restores the scroll
 * position it recorded for that history entry, which is more precise than
 * anything reconstructable here, and jumping to the top would throw away the
 * place in the grid the visitor pressed back to get to.
 *
 * The catch is that the overlays also push history entries (see useOverlay), so
 * closing the cart with the back gesture fires popstate too. That pop does not
 * change the route, which is how it is told apart from real navigation — a plain
 * "was this a popstate?" flag would be set by it and then swallow the scroll
 * reset on whatever the visitor tapped next.
 */
export function useScrollReset(hash) {
  const currentHash = useRef(hash);
  const traversed = useRef(false);
  const firstRender = useRef(true);

  useEffect(() => {
    const onPop = () => {
      // Runs before React re-renders, so currentHash is still the route being
      // left and window.location is already the one being entered.
      traversed.current = window.location.hash.slice(1) !== currentHash.current;
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    currentHash.current = hash;
    // The first pass is the initial load, where the browser has already decided
    // where the page sits.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (traversed.current) {
      traversed.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [hash]);
}
