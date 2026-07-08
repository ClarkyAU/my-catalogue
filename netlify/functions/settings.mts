import type { Config } from "@netlify/functions";
import { getSettings } from "../../server/settings.js";

// Public endpoint exposing editable site copy (e.g. the landing-page intro) so
// the storefront can render the owner's latest text.
export default async () => {
  try {
    const settings = await getSettings();
    return Response.json(settings, {
      headers: { "cache-control": "public, max-age=0, must-revalidate" },
    });
  } catch (err) {
    console.error("Failed to load settings", err);
    return Response.json({ error: "Failed to load settings" }, { status: 500 });
  }
};

export const config: Config = {
  path: "/api/settings",
  method: "GET",
};
