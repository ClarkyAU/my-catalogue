import type { Config } from "@netlify/functions";
import { buildCatalogue, ensureSeeded } from "../../server/catalogue.js";

// Public endpoint powering the storefront. Seeds the database from the bundled
// snapshot on first run, then returns the live catalogue as slug-keyed JSON.
export default async () => {
  try {
    await ensureSeeded();
    const catalogue = await buildCatalogue();
    return Response.json(catalogue, {
      headers: { "cache-control": "public, max-age=0, must-revalidate" },
    });
  } catch (err) {
    console.error("Failed to build catalogue", err);
    return Response.json({ error: "Failed to load catalogue" }, { status: 500 });
  }
};

export const config: Config = {
  path: "/api/catalogue",
  method: "GET",
};
