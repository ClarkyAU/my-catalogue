import { useSyncExternalStore } from 'react';

// The basket a customer fills before sending one message to Clarky. It lives in
// this browser only: there are no customer accounts to hang a server-side cart
// off, and the order itself is placed in a Telegram chat rather than checked out
// here, so nothing about it needs to reach the server. localStorage means a
// half-built order survives a refresh, an accidental back, or coming back later
// in the day.

const KEY = 'clarky3d.cart.v1';

// Enough for any realistic order, and a hard stop on a stuck +.
const MAX_QTY = 99;

// Free-text colour requests are shown back in the cart and pasted into a chat,
// so they are kept to a sentence rather than an essay.
export const MAX_COLOUR_NOTE = 80;

const listeners = new Set();

/** How one colour choice is identified, whatever kind of choice it is. */
function colourKey(colour) {
  if (colour?.custom) return `custom:${(colour.note || '').trim().toLowerCase()}`;
  if (colour?.id) return `filament:${colour.id}`;
  return 'any';
}

/**
 * Identity of a cart line. The same print in two colours is two lines, because
 * they are two different things to make — but adding the same product in the
 * same colours twice just bumps the quantity. A print whose parts are coloured
 * separately keys on the whole combination, and so do the made-to-order choices
 * it was ordered with: two of the same case with different inlays are two
 * different things to make.
 */
function lineKey(path, colours, options) {
  const colourPart = () => {
    if (colours.length === 0) return `${path}|any`;
    // A print that is one colour keys on just that colour, the way it always
    // has, so carts built before parts existed keep the keys they were saved
    // with.
    if (colours.length === 1 && !colours[0].part) return `${path}|${colourKey(colours[0].colour)}`;
    return [path, ...colours.map((slot) => `${slot.part}=${colourKey(slot.colour)}`)].join('|');
  };
  const base = colourPart();
  // Appended only when there are choices, so a line on a print that offers none
  // keys exactly as it did before options existed.
  if (options.length === 0) return base;
  return [base, ...options.map((option) => `${option.name}=${option.choice}`)].join('|');
}

/**
 * The canonical form of a colour selection: one entry per part that was asked
 * about, in the order it was asked. A single-colour print with nothing picked
 * carries no entries at all rather than one empty one.
 */
export function normalizeColours(colours) {
  if (!Array.isArray(colours)) return [];
  const slots = colours.map((slot) => ({ part: slot?.part || null, colour: slot?.colour || null }));
  if (slots.length === 1 && !slots[0].part && !slots[0].colour) return [];
  return slots;
}

/**
 * The canonical form of the made-to-order choices a line was ordered with: one
 * entry per question that was asked, in the order it was asked. Anything without
 * both a question and an answer is dropped rather than carried into the message.
 */
export function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options
    .map((option) => ({
      name: typeof option?.name === 'string' ? option.name.trim() : '',
      choice: typeof option?.choice === 'string' ? option.choice.trim() : '',
    }))
    .filter((option) => option.name && option.choice);
}

/**
 * Lines used to carry a single `colour`, and lines saved before a print could
 * offer choices carry no `options` at all. Anything older is lifted into the
 * current shape rather than thrown away, so a cart left open over either change
 * still opens with everything in it.
 */
function normalizeLine(line) {
  const withOptions = Array.isArray(line.options) ? line : { ...line, options: [] };
  if (Array.isArray(withOptions.colours)) return withOptions;
  const lifted = {
    ...withOptions,
    colours: normalizeColours([{ part: null, colour: withOptions.colour }]),
  };
  delete lifted.colour;
  return lifted;
}

/** Guards against a corrupted or older payload taking the storefront down. */
const isLine = (line) =>
  line &&
  typeof line.key === 'string' &&
  typeof line.path === 'string' &&
  typeof line.name === 'string' &&
  Number.isFinite(line.qty);

function read() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(isLine).map(normalizeLine) : [];
  } catch {
    // Unreadable, or storage blocked entirely (Safari private browsing).
    return [];
  }
}

// Declared after isLine and read, both of which this call depends on.
let lines = read();

function notify() {
  for (const listener of listeners) listener();
}

function commit(next) {
  lines = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    // Out of quota or storage blocked. The cart still works for this visit; it
    // just will not survive a refresh, which beats failing the add outright.
  }
  notify();
}

/** A colour choice as one readable line, e.g. "Galaxy Black (PLA, Matte)". */
export function colourLabel(colour) {
  if (colour?.custom) {
    const note = colour.note?.trim();
    return note ? `Not listed — ${note}` : 'Not listed — to discuss in chat';
  }
  if (!colour?.name) return null;
  // "Standard" is the absence of a special finish, so it adds nothing here.
  const traits = [colour.material, colour.finish === 'Standard' ? null : colour.finish]
    .map((part) => (part || '').trim())
    .filter(Boolean);
  return traits.length ? `${colour.name} (${traits.join(', ')})` : colour.name;
}

/**
 * Add a product to the cart, or add to the quantity if that exact product, in
 * those exact colours and built the same way, is already in it. The line keeps
 * its own copy of the name and price so the cart still reads correctly on a page
 * that no longer has the catalogue in hand; `path` is what links each line back
 * to the live product.
 */
export function addToCart({
  path,
  name,
  price,
  categoryName,
  subCategoryName,
  photo,
  colours,
  options,
}) {
  if (!path || !name) return;

  const picked = normalizeColours(colours);
  const chosen = normalizeOptions(options);
  const key = lineKey(path, picked, chosen);
  const existing = lines.find((line) => line.key === key);

  if (existing) {
    commit(
      lines.map((line) =>
        line.key === key ? { ...line, qty: Math.min(line.qty + 1, MAX_QTY) } : line,
      ),
    );
    return;
  }

  commit([
    ...lines,
    {
      key,
      path,
      name,
      price,
      categoryName,
      subCategoryName,
      photo,
      colours: picked,
      options: chosen,
      qty: 1,
    },
  ]);
}

/** Set a line's quantity. Dropping to zero removes it, which is what − at 1 means. */
export function setQty(key, qty) {
  if (qty < 1) {
    removeLine(key);
    return;
  }
  commit(lines.map((line) => (line.key === key ? { ...line, qty: Math.min(qty, MAX_QTY) } : line)));
}

export function removeLine(key) {
  commit(lines.filter((line) => line.key !== key));
}

export function clearCart() {
  commit([]);
}

/**
 * What the cart adds up to. Unpriced listings are quoted in the chat rather than
 * priced here, so they are counted separately instead of being silently treated
 * as free.
 */
export function cartTotal(cart) {
  let total = 0;
  let unpriced = 0;
  for (const line of cart) {
    const value = Number(line.price);
    if (line.price && line.price !== '0.00' && Number.isFinite(value)) total += value * line.qty;
    else unpriced += line.qty;
  }
  return { total, unpriced, priced: total > 0 };
}

export const cartCount = (cart) => cart.reduce((sum, line) => sum + line.qty, 0);

export const money = (value) => `$${value.toFixed(2)}`;

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// A cart edited in one tab should not be silently undone by a stale copy in
// another, so changes to the stored cart are picked up wherever it is open.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== KEY) return;
    lines = read();
    notify();
  });
}

export const useCart = () => useSyncExternalStore(subscribe, () => lines);
