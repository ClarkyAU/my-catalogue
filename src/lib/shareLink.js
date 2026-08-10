// Links to a product have to survive being pasted into a chat. The app routes
// on the URL fragment (#category/subcategory/product), but a fragment is never
// sent to the server, so a link-preview crawler fetching a shared link sees
// nothing but the bare homepage. Shared links therefore carry the route in a
// `?p=` query parameter instead, which the social-preview edge function reads
// to build a per-product preview card.
//
// Nothing else in the app has to know about the parameter: as soon as a real
// browser opens the link it is folded back into the hash route the router
// already understands, and normal in-app navigation stays hash-based.

const SHARE_PARAM = 'p';

// Slugs come from the server's slugify(), which reduces everything to letters,
// digits and underscores, so a whole route is only those plus the "/"
// separators. Anything else was hand-edited into the URL and is ignored.
const VALID_PATH = /^[A-Za-z0-9_]+(?:\/[A-Za-z0-9_]+){0,2}$/;

/** Absolute, crawler-readable URL for a `category/subcategory/product` route. */
export const shareUrl = (path) => `${window.location.origin}/?${SHARE_PARAM}=${path}`;

/**
 * Turn an incoming `?p=` share link back into the hash route the app runs on.
 * Called once before React mounts, so the router's first read of the hash
 * already sees the right value and the product renders without a flash of the
 * landing page. Uses replaceState so the share link does not become a history
 * entry the back button lands on.
 */
export function consumeShareParam() {
  const params = new URLSearchParams(window.location.search);
  const path = params.get(SHARE_PARAM);
  if (!path) return;

  params.delete(SHARE_PARAM);
  const query = params.toString();
  const hash = VALID_PATH.test(path) ? `#${path}` : '';
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${hash}`);
}
