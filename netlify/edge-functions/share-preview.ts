import type { Config, Context } from "@netlify/edge-functions";

// The storefront is a client-rendered app that routes on the URL fragment, so
// a link-preview crawler fetching a shared link only ever sees the empty HTML
// shell and every product previews as the same generic "Clarky3D" card. Since
// most ordering happens by pasting a link into a Telegram chat, that is the
// preview that matters most.
//
// Shared links therefore carry their route in a `?p=` query parameter (see
// src/lib/shareLink.js), which does reach the server. This function reads it,
// looks the product up in the catalogue and swaps the default social tags in
// the shell for that product's title, description and photo.

const SHARE_PARAM = "p";

// Slugs come from the server's slugify(), which reduces everything to letters,
// digits and underscores. Only full category/subcategory/product routes get a
// preview, because those are the only links the storefront shares.
const VALID_PATH = /^[A-Za-z0-9_]+(?:\/[A-Za-z0-9_]+){2}$/;

// Link unfurlers, not browsers. Everyone else is passed straight through.
const CRAWLER =
  /telegram|facebookexternalhit|facebot|twitterbot|whatsapp|discordbot|slackbot|slack-imgproxy|linkedinbot|googlebot|bingbot|duckduckbot|yandex|redditbot|pinterest|skypeuripreview|embedly|iframely|applebot|vkshare|mastodon|bluesky|viber|flipboard|tumblr|nuzzel|quora link preview/i;

// The block of tags in index.html this function replaces.
const META_START = "<!-- social-meta:start -->";
const META_END = "<!-- social-meta:end -->";

// A slow catalogue must never hold a page hostage; without a preview the link
// still works, it just looks plain.
const CATALOGUE_TIMEOUT_MS = 3000;

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
  // full-resolution original.
  const photo = product.photos?.[0]?.url;
  const image = photo
    ? `${origin}/.netlify/images?url=${encodeURIComponent(photo)}&w=1200&fm=jpg&q=80`
    : null;

  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Clarky3D" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(shareUrl)}" />`,
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
  ];

  if (image) {
    tags.push(`<meta property="og:image" content="${escapeHtml(image)}" />`);
    tags.push(`<meta property="og:image:alt" content="${escapeHtml(product.displayName)}" />`);
    tags.push(`<meta name="twitter:image" content="${escapeHtml(image)}" />`);
  }

  return tags.join("\n    ");
}

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const path = url.searchParams.get(SHARE_PARAM);
  if (!path || !VALID_PATH.test(path)) return;

  // Only unfurlers need the rewritten head, so a real visitor following a
  // shared link never waits on the catalogue lookup this makes. `?preview=1`
  // forces it on for checking a card without waiting for a crawler.
  if (!CRAWLER.test(req.headers.get("user-agent") || "") && !url.searchParams.has("preview")) {
    return;
  }

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
