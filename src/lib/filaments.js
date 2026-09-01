// The colour library is needed in three places — the landing page's "on the
// shelf" strip, the colour picker on a product, and the standalone Colours page
// — and it is the same small list every time. The in-flight request is
// remembered so navigating between any of them reuses the first response instead
// of refetching. A failed request resolves to an empty list rather than
// rejecting, so a cached rejection can never wedge every later caller.

let pending = null;

/**
 * Seed the cache from a list that has already arrived by other means. The
 * storefront's startup payload carries the filaments alongside the catalogue
 * (see netlify/functions/bootstrap.mts), so by the time anything renders the
 * list is already in hand — calling /api/filaments as well would be a second
 * function invocation, and a second cold start, for bytes we have.
 */
export function primeFilaments(list) {
  if (Array.isArray(list)) pending = Promise.resolve(list);
}

/**
 * The public filament list. Resolves to [] if the request fails.
 *
 * In practice this returns the primed list from startup. The fetch is the
 * fallback for the case where the bootstrap payload arrived without one.
 */
export function loadFilaments() {
  if (!pending) {
    pending = fetch('/api/filaments')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => (Array.isArray(data) ? data : []))
      .catch(() => []);
  }
  return pending;
}
