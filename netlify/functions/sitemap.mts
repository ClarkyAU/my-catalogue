import type { Config } from "@netlify/functions";
import { buildCatalogue } from "../../server/catalogue.js";
import { CACHE_TAGS, cacheHeaders } from "../../server/cache.js";

// The storefront routes on the URL fragment, which a crawler never sends to a
// server, so on its own the whole catalogue looks like a single page. Every
// product also has a `?p=category/subcategory/product` share link that does
// reach the server and gets real per-product tags from the share-preview edge
// function — this lists those links so a search engine can find them at all
// rather than waiting to stumble across one shared somewhere.
//
// Hidden products are already excluded by buildCatalogue(), so a withdrawn
// listing never appears here.

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

const escapeXml = (value: string) => value.replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);

interface Entry {
  loc: string;
  priority: string;
  changefreq: string;
}

function urlEntry({ loc, priority, changefreq }: Entry): string {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
}

export default async (req: Request) => {
  const { origin } = new URL(req.url);

  try {
    const catalogue = await buildCatalogue();

    // The landing page is the only route that stands on its own without a
    // share parameter, so it is listed first and ranked highest.
    const entries: Entry[] = [{ loc: `${origin}/`, changefreq: "weekly", priority: "1.0" }];

    for (const [catSlug, category] of Object.entries(catalogue)) {
      for (const [subSlug, subCategory] of Object.entries(category.subCategories || {})) {
        for (const prodSlug of Object.keys((subCategory as { products?: object }).products || {})) {
          entries.push({
            loc: `${origin}/?p=${catSlug}/${subSlug}/${prodSlug}`,
            changefreq: "weekly",
            priority: "0.8",
          });
        }
      }
    }

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...entries.map(urlEntry),
      "</urlset>",
      "",
    ].join("\n");

    return new Response(xml, {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        ...cacheHeaders(CACHE_TAGS.catalogue),
      },
    });
  } catch (err) {
    // A crawler that gets an error retries later; one that gets a truncated
    // sitemap may drop the pages missing from it.
    console.error("Failed to build sitemap", err);
    return new Response("Failed to build sitemap", { status: 500 });
  }
};

export const config: Config = {
  path: "/sitemap.xml",
  method: "GET",
};
