import type { Config, Context } from "@netlify/edge-functions";

// The storefront is a client-rendered app that routes on the URL fragment, so a
// crawler fetching a shared link only ever sees the empty HTML shell: every
// product previews as the same generic "Clarky3D" card, and a search engine has
// exactly one page to index no matter how big the catalogue gets.
//
// Shared links therefore carry their route in a `?p=` query parameter (see
// src/lib/shareLink.js), which does reach the server. This function reads it,
// looks the product up in the catalogue and swaps the default social tags in the
// shell for that product's title, description, photo, canonical URL and
// Product structured data.
//
// This used to run only for known link unfurlers, sniffed by user agent, because
// the catalogue lookup it needs was uncached and would have made every visitor
// wait on it. The catalogue is now held at the edge (see server/cache.ts), so
// the rewrite runs for everyone: the user-agent allowlist could never be
// complete, sniffing meant search engines and chat clients were served different
// HTML for the same URL, and varying the response by user agent makes it far
// less cacheable than varying by URL alone.

const SHARE_PARAM = "p";

// Slugs come from the server's slugify(), which reduces everything to letters,
// digits and underscores. Only full category/subcategory/product routes get a
// preview, because those are the only links the storefront shares.
const VALID_PATH = /^[A-Za-z0-9_]+(?:\/[A-Za-z0-9_]+){2}$/;

// The block of tags in index.html this function replaces.
const META_START = "<!-- social-meta:start -->";
const META_END = "<!-- social-meta:end -->";

// A slow catalogue must never hold a page hostage; without a preview the link
// still works, it just looks plain.
const CATALOGUE_TIMEOUT_MS = 3000;

// Prices are stored without a currency, and every price on the site is in
// Australian dollars. Structured data has to name one explicitly or a search
// result will guess at the wrong dollar — this is metadata only and is never
// rendered on the page.
const CURRENCY = "AUD";

// Kept in step with the same tags in index.html — a listing with no photo yet
// still unfurls with the site's card rather than a blank one.
const DEFAULT_OG_IMAGE = "/og-default.jpg";
const DEFAULT_OG_ALT = "Clarky3D — made-to-order 3D prints";

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ESCAPES[char]);

/** Flatten the multi-line descriptions the admin portal stores into one line. */
const oneLine = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();

/** Trim to a length preview cards will not cut off, breaking on a word. */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Serialise structured data for embedding in a `<script>` tag. HTML escaping
 * cannot be used inside a script element — the parser does not decode entities
 * there — so `<` is written as a JSON unicode escape instead, which parses back
 * to the same character and so cannot close the block early.
 */
const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

interface Listing {
  product: { displayName: string; description?: string; price?: string; photos?: { url?: string }[] };
  categoryName: string;
  subCategoryName: string;
}

/**
 * Resolve a shared route against the live catalogue. Hidden products are left
 * out of that catalogue entirely, so a link to a withdrawn listing correctly
 * gets no preview.
 */
async function loadListing(origin: string, path: string): Promise<Listing | null> {
  try {
    const res = await fetch(new URL("/api/bootstrap", origin), {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(CATALOGUE_TIMEOUT_MS),
    });
    if (!res.ok) return null;

    const { catalogue } = await res.json();
    const [catSlug, subSlug, prodSlug] = path.split("/");
    const category = catalogue?.[catSlug];
    const subCategory = category?.subCategories?.[subSlug];
    const product = subCategory?.products?.[prodSlug];
    if (!product) return null;

    return {
      product,
      categoryName: category.displayName,
      subCategoryName: subCategory.displayName,
    };
  } catch {
    return null;
  }
}

/** The replacement head tags for one product. */
function buildMeta(listing: Listing, shareUrl: string, origin: string): string {
  const { product, categoryName, subCategoryName } = listing;
  const title = `${product.displayName} — Clarky3D`;

  // "0.00" is the placeholder for an unpriced listing, the same way the
  // storefront hides the price tag for one.
  const lead = [
    product.price && product.price !== "0.00" ? `$${product.price}` : null,
    [categoryName, subCategoryName].filter(Boolean).join(" / "),
  ]
    .filter(Boolean)
    .join(" · ");
  const body = oneLine(product.description) || "Made-to-order 3D print from Clarky3D.";
  const description = truncate(lead ? `${lead} — ${body}` : body, 200);

  // Uploads are stored at whatever resolution they were taken, so the preview
  // image goes through the Image CDN rather than sending an unfurler a
  // full-resolution original. A listing with no photo yet falls back to the
  // site's own card, because this block replaces the shell's default tags
  // wholesale and would otherwise leave the link with no image at all.
  const photo = product.photos?.[0]?.url;
  const image = photo
    ? `${origin}/.netlify/images?url=${encodeURIComponent(photo)}&w=1200&h=630&fit=cover&fm=jpg&q=80`
    : `${origin}${DEFAULT_OG_IMAGE}`;
  const imageAlt = photo ? product.displayName : DEFAULT_OG_ALT;

  // Structured data, which is what turns a search result into a rich one
  // carrying the price and photo. `price` is a plain decimal string in the
  // database, so an unpriced listing describes the product without claiming an
  // offer rather than advertising it as free.
  const priced = Boolean(product.price && product.price !== "0.00");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.displayName,
    description: truncate(body, 500),
    image: [image],
    url: shareUrl,
    category: [categoryName, subCategoryName].filter(Boolean).join(" / ") || undefined,
    brand: { "@type": "Brand", name: "Clarky3D" },
    offers: priced
      ? {
          "@type": "Offer",
          url: shareUrl,
          price: product.price,
          priceCurrency: CURRENCY,
          itemCondition: "https://schema.org/NewCondition",
          availability: "https://schema.org/InStock",
          seller: { "@type": "Organization", name: "Clarky3D" },
        }
      : undefined,
  };

  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${escapeHtml(shareUrl)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Clarky3D" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(shareUrl)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    `<meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />`,
    `<script type="application/ld+json">${jsonLd(structuredData)}</script>`,
  ];

  return tags.join("\n    ");
}

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const path = url.searchParams.get(SHARE_PARAM);
  if (!path || !VALID_PATH.test(path)) return;

  // The catalogue lookup and the shell fetch do not depend on each other, so
  // they run together rather than one after the other. loadListing resolves to
  // null instead of rejecting, so it can never leave a dangling rejection here.
  const listingPromise = loadListing(url.origin, path);
  const page = await context.next();

  try {
    if (!(page.headers.get("content-type") || "").includes("text/html")) return page;

    const listing = await listingPromise;
    if (!listing) return page;

    const html = await page.text();
    const start = html.indexOf(META_START);
    const end = html.indexOf(META_END);
    // The shell no longer carries the markers this targets — serve it as it is
    // rather than guessing where its head tags are.
    if (start === -1 || end === -1 || end < start) return new Response(html, page);

    const meta = buildMeta(listing, `${url.origin}/?${SHARE_PARAM}=${path}`, url.origin);
    const rewritten = `${html.slice(0, start + META_START.length)}\n    ${meta}\n    ${html.slice(end)}`;

    // The body changed length, so the shell's own length and validator headers
    // no longer describe it.
    const headers = new Headers(page.headers);
    headers.delete("content-length");
    headers.delete("etag");

    return new Response(rewritten, { status: page.status, statusText: page.statusText, headers });
  } catch (err) {
    // A broken preview must never cost someone the page itself.
    console.error("Failed to build share preview", err);
    return page;
  }
};

export const config: Config = {
  path: "/",
};
