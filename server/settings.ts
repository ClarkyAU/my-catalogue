import { db } from "../db/index.js";
import { siteSettings } from "../db/schema.js";

// Editable site copy, keyed by a stable string. Defaults are used whenever the
// owner has not overridden a value yet, so the storefront always has sensible
// text even before anything is saved in the admin portal.
export const SETTINGS_DEFAULTS: Record<string, string> = {
  landingIntro:
    "I am currently working on a batch of new products, so keep an eye out for updates.",
  landingSubtext:
    "Check out the latest releases below, or hit [ MY CATALOGUE ] above to browse every category and product.",
  landingNote:
    "If there is anything you would like that is not listed, shoot me a message via the order button.",
  // Watermark stamped over preview images on the Featured Items page for
  // products flagged "new" or "popular" in the admin portal.
  watermarkEnabled: "true",
  watermarkNewLabel: "NEW",
  watermarkPopularLabel: "POPULAR",
  watermarkStyle: "ribbon",
  watermarkPosition: "top-left",
  watermarkOpacity: "0.9",
};

export const WATERMARK_STYLES = ["ribbon", "stamp", "tag"];
export const WATERMARK_POSITIONS = ["top-left", "top-right", "bottom-left", "bottom-right"];
export const PRODUCT_BADGES = ["none", "new", "popular"];

const MAX_WATERMARK_LABEL = 18;

/** Coerce a stored/submitted setting into a value the storefront can trust. */
export function normalizeSetting(key: string, raw: unknown): string {
  const value = String(raw ?? "");
  switch (key) {
    case "watermarkEnabled":
      return value === "true" ? "true" : "false";
    case "watermarkStyle":
      return WATERMARK_STYLES.includes(value) ? value : SETTINGS_DEFAULTS.watermarkStyle;
    case "watermarkPosition":
      return WATERMARK_POSITIONS.includes(value) ? value : SETTINGS_DEFAULTS.watermarkPosition;
    case "watermarkOpacity": {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return SETTINGS_DEFAULTS.watermarkOpacity;
      return Math.min(1, Math.max(0.2, parsed)).toFixed(2);
    }
    case "watermarkNewLabel":
    case "watermarkPopularLabel":
      return value.trim().slice(0, MAX_WATERMARK_LABEL);
    default:
      return value;
  }
}

/** Coerce a product's watermark flag to one of the badges the storefront knows. */
export function normalizeBadge(raw: unknown): string {
  const value = String(raw ?? "none");
  return PRODUCT_BADGES.includes(value) ? value : "none";
}

/** Read every setting, layering saved values over the built-in defaults. */
export async function getSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(siteSettings);
  const merged: Record<string, string> = { ...SETTINGS_DEFAULTS };
  for (const row of rows) {
    if (row.key in SETTINGS_DEFAULTS) merged[row.key] = normalizeSetting(row.key, row.value);
  }
  return merged;
}

/** Upsert a single setting value. */
export async function setSetting(key: string, raw: string): Promise<string> {
  const value = normalizeSetting(key, raw);
  await db
    .insert(siteSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value, updatedAt: new Date() },
    });
  return value;
}

