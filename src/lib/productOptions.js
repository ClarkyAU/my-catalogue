// Beyond colour, a print can be made in versions: one has a choice of inlay,
// another a choice of lid, a third whether a logo goes on. The owner declares
// those questions per product in the admin portal, and the storefront asks them
// on the product page. Nothing here is tied to a particular kind of variation —
// only the owner's own wording ever reaches a customer.

// Upper bounds, kept in sync with MAX_PRODUCT_OPTIONS, MAX_OPTION_CHOICES,
// MAX_OPTION_NAME and MAX_CHOICE_NAME in server/catalogue.ts.
export const MAX_PRODUCT_OPTIONS = 4;
export const MAX_OPTION_CHOICES = 12;
export const MAX_OPTION_NAME = 40;
export const MAX_CHOICE_NAME = 60;

const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * The questions a listing wants answered, each with the answers on offer. A
 * question needs a name and at least two answers to be worth asking, so
 * anything short of that is left out. An empty list — most of the catalogue —
 * means the print is ordered as pictured.
 */
export function productOptions(product) {
  const raw = product?.options;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((option) => ({
      name: cleanText(option?.name),
      choices: Array.isArray(option?.choices) ? option.choices.map(cleanText).filter(Boolean) : [],
    }))
    .filter((option) => option.name && option.choices.length >= 2);
}

/**
 * What each question starts on: the owner's first answer. Every question
 * therefore always has a concrete answer, so nothing has to be validated on the
 * way into the cart and no order goes out with a blank in it.
 */
export function defaultSelections(options) {
  return options.map((option) => ({ name: option.name, choice: option.choices[0] }));
}

/** True when two option lists would produce the same set of questions. */
export const sameOptionList = (a, b) =>
  a.length === b.length &&
  a.every(
    (option, i) =>
      option.name === b[i].name &&
      option.choices.length === b[i].choices.length &&
      option.choices.every((choice, j) => choice === b[i].choices[j]),
  );
