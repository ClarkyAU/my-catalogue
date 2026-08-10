// The colour library is needed in two places now — the standalone Colours page
// and the colour picker on a product — and it is the same small list both
// times. The in-flight request is remembered so navigating between products, or
// from a product to the Colours page, reuses the first response instead of
// refetching. A failed request resolves to an empty list rather than rejecting,
// so a cached rejection can never wedge every later caller.

let pending = null;

/** The public filament list. Resolves to [] if the request fails. */
export function loadFilaments() {
  if (!pending) {
    pending = fetch('/api/filaments')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => (Array.isArray(data) ? data : []))
      .catch(() => []);
  }
  return pending;
}
