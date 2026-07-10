import { asc } from "drizzle-orm";
import { db } from "../db/index.js";
import { filaments } from "../db/schema.js";

// The only stock states the storefront and admin understand. Anything else is
// coerced back to "In Stock" so the public page never shows a stray status.
export const FILAMENT_STATUSES = ["In Stock", "Out of Stock", "On Order"] as const;
export type FilamentStatus = (typeof FILAMENT_STATUSES)[number];

export function normalizeStatus(input: unknown): FilamentStatus {
  return (FILAMENT_STATUSES as readonly string[]).includes(input as string)
    ? (input as FilamentStatus)
    : "In Stock";
}

/** Validate a #rrggbb colour, falling back to black on anything malformed. */
export function normalizeHex(input: unknown): string {
  const s = String(input ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : "#000000";
}

/**
 * Public-safe filament list. Only colour-facing fields are returned; the
 * supplier is never stored, so there is nothing sensitive to strip.
 */
export async function listFilaments() {
  const rows = await db
    .select()
    .from(filaments)
    .orderBy(asc(filaments.sortOrder), asc(filaments.id));
  return rows.map((f) => ({
    id: f.id,
    name: f.name,
    material: f.material,
    hex: f.hex,
    status: f.status,
  }));
}
