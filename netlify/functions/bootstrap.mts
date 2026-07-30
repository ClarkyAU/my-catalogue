import type { Config } from "@netlify/functions";
import { buildCatalogue, ensureSeeded } from "../../server/catalogue.js";
import { getSettings } from "../../server/settings.js";

// Single public endpoint the storefront calls on startup. The catalogue and the
// editable site copy used to be two separate requests, which meant two cold
// function invocations and two database round trips before the page could
// render — they are always needed together, so they are fetched together.
export default async () => {
  try {
    await ensureSeeded();
    const [catalogue, settings] = await Promise.all([buildCatalogue(), getSettings()]);
    return Response.json(
      { catalogue, settings },
      { headers: { "cache-control": "public, max-age=0, must-revalidate" } },
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
