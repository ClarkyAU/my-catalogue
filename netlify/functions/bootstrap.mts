import type { Config } from "@netlify/functions";
import { buildCatalogue, ensureSeeded } from "../../server/catalogue.js";
import { getSettings } from "../../server/settings.js";
import { listFilaments } from "../../server/filaments.js";
import { CACHE_TAGS, cacheHeaders } from "../../server/cache.js";

// Single public endpoint the storefront calls on startup. The catalogue and the
// editable site copy used to be two separate requests, which meant two cold
// function invocations and two database round trips before the page could
// render — they are always needed together, so they are fetched together.
//
// The filament library joined them for the same reason. Every product page asks
// for a colour, so the storefront was calling /api/filaments straight after this
// one: a second function, a second cold start (measured at over four seconds on
// a cold container) and a second round trip, for under two kilobytes of JSON
// that is needed on the very first render. Folding it in makes the whole startup
// one request, and the colour choices stop appearing a beat after the photo they
// are asked about.
//
// /api/filaments is still there — the Colours page is reachable directly, and it
// remains the fallback if this payload ever arrives without the list.
//
// Seeding is checked by looking at what the catalogue read actually returned,
// rather than by asking first. ensureSeeded() opens with its own `count(*)` on
// categories, so calling it up front meant one extra query on every cold
// container for a first-run case that cannot recur once the database has
// anything in it — and each query is a database the platform has to wake and
// then bill for its whole active period plus an idle timeout. An empty tree is
// exactly the condition that count was testing for, so the read answers it for
// free, and a genuinely empty database still seeds and is served on the same
// request.
export default async () => {
  try {
    const [tree, settings, filaments] = await Promise.all([
      buildCatalogue(),
      getSettings(),
      listFilaments(),
    ]);

    let catalogue = tree;
    if (Object.keys(catalogue).length === 0) {
      await ensureSeeded();
      catalogue = await buildCatalogue();
    }

    return Response.json(
      { catalogue, settings, filaments },
      // Tagged with both, so editing a colour invalidates this response as well
      // as /api/filaments.
      { headers: cacheHeaders(CACHE_TAGS.catalogue, CACHE_TAGS.filaments) },
    );
  } catch (err) {
    console.error("Failed to load storefront bootstrap", err);
    return Response.json({ error: "Failed to load catalogue" }, { status: 500 });
  }
};

export const config: Config = {
  path: "/api/bootstrap",
  method: "GET",
};
