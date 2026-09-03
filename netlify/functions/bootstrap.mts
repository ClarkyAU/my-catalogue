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
export default async () => {
  try {
    await ensureSeeded();
    const [catalogue, settings, filaments] = await Promise.all([
      buildCatalogue(),
      getSettings(),
      listFilaments(),
    ]);
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
