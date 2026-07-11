import { asc, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { filaments, filamentPhotos } from "../db/schema.js";

// The only stock states the storefront and admin understand. Anything else is
// coerced back to "In Stock" so the public page never shows a stray status.
export const FILAMENT_STATUSES = ["In Stock", "Out of Stock", "On Order"] as const;
export type FilamentStatus = (typeof FILAMENT_STATUSES)[number];

// Surface finishes the colour picker offers. "Standard", "Matte" and "Silk"
// use a single colour; "Marble" speckles hex2 over hex; "Gradient" blends the
// ordered `colors` list horizontally.
export const FILAMENT_FINISHES = ["Standard", "Matte", "Silk", "Marble", "Gradient"] as const;
export type FilamentFinish = (typeof FILAMENT_FINISHES)[number];

// Upper bound on how many colours a single gradient may blend.
export const MAX_GRADIENT_COLORS = 6;

export function normalizeStatus(input: unknown): FilamentStatus {
  return (FILAMENT_STATUSES as readonly string[]).includes(input as string)
    ? (input as FilamentStatus)
    : "In Stock";
}

export function normalizeFinish(input: unknown): FilamentFinish {
  // "Solid" was the original name for the default finish; keep old rows working.
  if (input === "Solid") return "Standard";
  return (FILAMENT_FINISHES as readonly string[]).includes(input as string)
    ? (input as FilamentFinish)
    : "Standard";
}

/** Validate a #rrggbb colour, falling back to black on anything malformed. */
export function normalizeHex(input: unknown): string {
  const s = String(input ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : "#000000";
}

/**
 * Validate an optional #rrggbb colour, returning null when absent or malformed.
 * Used for the speckle colour of the Marble finish (hex2).
 */
export function normalizeOptionalHex(input: unknown): string | null {
  const s = String(input ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : null;
}

/**
 * Validate the ordered colour list of a Gradient finish. Keeps only valid
 * #rrggbb entries, caps the count, and returns null unless at least two remain
 * (a gradient needs two colours to blend).
 */
export function normalizeColors(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const cleaned = input
    .map((c) => String(c ?? "").trim().toLowerCase())
    .filter((c) => /^#[0-9a-fA-F]{6}$/.test(c))
    .slice(0, MAX_GRADIENT_COLORS);
  return cleaned.length >= 2 ? cleaned : null;
}

/**
 * Public-safe filament list. Only colour-facing fields are returned; the
 * supplier is never stored, so there is nothing sensitive to strip. Each
 * filament carries its gallery of example prints so the storefront can show
 * what has been printed in that colour.
 */
export async function listFilaments() {
  const rows = await db
    .select()
    .from(filaments)
    .orderBy(asc(filaments.sortOrder), asc(filaments.id));

  const ids = rows.map((f) => f.id);
  const pics = ids.length
    ? await db
        .select()
        .from(filamentPhotos)
        .where(inArray(filamentPhotos.filamentId, ids))
        .orderBy(asc(filamentPhotos.sortOrder), asc(filamentPhotos.id))
    : [];

  return rows.map((f) => ({
    id: f.id,
    name: f.name,
    material: f.material,
    finish: normalizeFinish(f.finish),
    hex: f.hex,
    hex2: f.hex2,
    colors: f.colors,
    status: f.status,
    prints: pics
      .filter((p) => p.filamentId === f.id)
      .map((p) => ({
        id: p.id,
        url: `/api/filament-photos/${p.id}`,
        caption: p.caption || "",
      })),
  }));
}
