// Some prints carry a line of the customer's own words — a name on a keyring, a
// date on a plaque, a message on a sign. Whether a print takes one at all is the
// owner's call per listing, and so is the wording of the question, because "Name
// to print" and "Text to engrave" ask for different things and only the person
// making it knows which one this is.

// How long the owner's own wording of the question can be, kept in sync with
// MAX_CUSTOM_TEXT_LABEL in server/catalogue.ts. Nothing here bounds what the
// customer types — that is theirs to decide.
export const MAX_CUSTOM_TEXT_LABEL = 40;
export const DEFAULT_CUSTOM_TEXT_LABEL = 'Custom text';

/**
 * What this listing asks for in its own words, or null for the prints that take
 * no custom text — which is most of them. The same trimming the server applies
 * on save is applied again here, so a listing stored with a blank question still
 * renders a field the storefront can trust.
 */
export function productCustomText(product) {
  const raw = product?.customText;
  if (!raw || typeof raw !== 'object') return null;
  const label =
    typeof raw.label === 'string' && raw.label.trim()
      ? raw.label.trim().slice(0, MAX_CUSTOM_TEXT_LABEL)
      : DEFAULT_CUSTOM_TEXT_LABEL;
  return { label, required: Boolean(raw.required) };
}

/**
 * The admin editor's shape for the setting, whether it is on or off. Kept
 * separate from the stored shape so switching the box off and back on does not
 * lose the question that was already typed.
 */
export const customTextForm = (customText) => ({
  enabled: Boolean(customText),
  label: customText?.label || '',
  required: Boolean(customText?.required),
});

/** True when two editor states would save the same setting. */
export const sameCustomText = (a, b) =>
  Boolean(a.enabled) === Boolean(b.enabled) &&
  (!a.enabled || (a.label === b.label && Boolean(a.required) === Boolean(b.required)));
