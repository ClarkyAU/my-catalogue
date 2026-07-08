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
};

/** Read every setting, layering saved values over the built-in defaults. */
export async function getSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(siteSettings);
  const merged: Record<string, string> = { ...SETTINGS_DEFAULTS };
  for (const row of rows) merged[row.key] = row.value;
  return merged;
}

/** Upsert a single setting value. */
export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(siteSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value, updatedAt: new Date() },
    });
}
