/**
 * Cache policy for the public API.
 *
 * The catalogue and the colour library only change when the owner edits them in
 * the admin portal, but every visitor used to pay a function cold start and
 * several database round trips before the storefront could render anything.
 * These responses are therefore held at the edge indefinitely and invalidated
 * explicitly on write (see the purge call in netlify/functions/admin.mts), which
 * is both faster for visitors and far cheaper to run than recomputing them per
 * request.
 *
 * Two separate headers are set deliberately:
 *   - `netlify-cdn-cache-control` governs Netlify's shared cache only. This is
 *     where the long life and the `durable` directive go, so one origin call
 *     serves the whole network rather than one per edge node.
 *   - `cache-control` governs the visitor's own browser, and is kept at
 *     must-revalidate so an admin edit shows up on the next load for someone who
 *     already has the page open, instead of being pinned to a stale copy.
 *
 * Netlify also voids cached responses on a new deploy by default, so a code
 * change cannot serve a stale payload either.
 */

/** Cache tags, so a write can invalidate exactly what it affected. */
export const CACHE_TAGS = {
  /** The catalogue tree, the editable site copy, and the sitemap built from them. */
  catalogue: "catalogue",
  /** The filament colour library and its example prints. */
  filaments: "filaments",
} as const;

/** Long-lived edge cache for a response that is invalidated explicitly on write. */
export function cacheHeaders(tag: string): Record<string, string> {
  return {
    "netlify-cdn-cache-control": "public, durable, s-maxage=31536000, stale-while-revalidate=60",
    "cache-control": "public, max-age=0, must-revalidate",
    "cache-tag": tag,
  };
}

/**
 * Cache policy for an immutable binary served out of Blobs. The URL contains the
 * row id and a photo's bytes never change once uploaded — a replacement is a new
 * row with a new id — so both the browser and the edge can keep it forever. The
 * point of the edge half is that it collapses every later request for the same
 * image into zero function invocations and zero database queries.
 */
export function immutableAssetHeaders(contentType: string): Record<string, string> {
  return {
    "content-type": contentType,
    "netlify-cdn-cache-control": "public, durable, s-maxage=31536000, immutable",
    "cache-control": "public, max-age=31536000, immutable",
  };
}
