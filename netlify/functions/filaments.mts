import type { Config } from "@netlify/functions";
import { listFilaments } from "../../server/filaments.js";

// Public endpoint powering the storefront "Colours" page. Returns only
// colour-facing fields — the supplier name is never stored or exposed.
export default async () => {
  try {
    const rows = await listFilaments();
    return Response.json(rows, {
      headers: { "cache-control": "public, max-age=0, must-revalidate" },
    });
  } catch (err) {
    console.error("Failed to list filaments", err);
    return Response.json({ error: "Failed to load filaments" }, { status: 500 });
  }
};

export const config: Config = {
  path: "/api/filaments",
  method: "GET",
};
