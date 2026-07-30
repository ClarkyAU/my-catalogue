// Plain values the filament editor needs, kept out of the component files so
// fast refresh keeps working.

// The three stock states the storefront understands, in the order the editor
// lists them. Kept in sync with the server's FILAMENT_STATUSES; anything else
// is coerced back to "In Stock" on save.
export const FILAMENT_STATUSES = ['In Stock', 'Out of Stock', 'On Order'];

// What a brand new Gradient starts out as.
export const DEFAULT_GRADIENT = ['#00e5ff', '#ff00aa'];

// "Solid" was the finish's original name; treat legacy rows as "Standard".
export function normFinish(finish) {
  return finish === 'Solid' ? 'Standard' : finish || 'Standard';
}
