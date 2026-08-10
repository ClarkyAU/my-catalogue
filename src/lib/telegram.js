import { cartTotal, colourLabel, money } from './cart.js';

// Ordering happens in a Telegram chat, so the cart is turned into one written
// message rather than a checkout. Telegram's `?text=` deep link pre-fills the
// message box (the customer still has to press send — Telegram never auto-sends),
// which saves them describing several products from memory and saves the round
// of "which one did you mean?" that follows.

export const TELEGRAM_HANDLE = 'Clarky_AU';
export const TELEGRAM_URL = `https://t.me/${TELEGRAM_HANDLE}`;

// Deep links travel through chat clients and URL bars, so a very long message
// risks being truncated somewhere along the way. Past this many lines the cart
// is summarised and the detail is left for the conversation.
const MAX_DETAILED_LINES = 12;

/** A colour choice as it reads in a chat, including when none was made. */
const colourText = (colour) => colourLabel(colour) || 'Any / Lucky Dip';

/**
 * The colour choices as one short phrase, for the summarised form of a long
 * cart: "Black (PLA)" for a single-colour print, "Lid Black, Body Red" for one
 * whose parts are coloured separately.
 */
function summariseColours(colours) {
  if (!colours?.length) return '';
  return colours
    .map((slot) => {
      const label = colourLabel(slot.colour) || 'Lucky Dip';
      return slot.part ? `${slot.part} ${label}` : label;
    })
    .join(', ');
}

/**
 * The made-to-order choices as one short phrase, for the summarised form of a
 * long cart: "Inlay Hex, Lid Solid".
 */
function summariseOptions(options) {
  if (!options?.length) return '';
  return options.map((option) => `${option.name} ${option.choice}`).join(', ');
}

/** One cart line as the block of text describing it. */
function describeLine(line, numbered) {
  const heading = [numbered ? `${numbered}. ` : '', line.name, line.qty > 1 ? ` × ${line.qty}` : '']
    .join('')
    .trim();
  const out = [heading];

  // How the print is built comes before what colour it is, the same order the
  // product page asks in: "Inlay: Hex" decides what there is to colour.
  for (const option of line.options || []) out.push(`${option.name}: ${option.choice}`);

  // A print whose parts are coloured separately gets a line per part, so Clarky
  // can read the order off without asking which colour went where.
  const colours = line.colours || [];
  if (colours.length > 1 || colours[0]?.part) {
    for (const slot of colours) out.push(`${slot.part}: ${colourText(slot.colour)}`);
  } else {
    out.push(`Colour: ${colourText(colours[0]?.colour)}`);
  }

  // "0.00" is the placeholder for an unpriced listing, the same way the
  // storefront hides the price tag for one.
  const value = Number(line.price);
  if (line.price && line.price !== '0.00' && Number.isFinite(value)) {
    out.push(line.qty > 1 ? `${money(value)} each · ${money(value * line.qty)}` : money(value));
  } else {
    out.push('Price to confirm');
  }

  // In a multi-product order the continuation lines sit under the product name,
  // so each product stays legible as its own block in a chat. A single product
  // needs no such grouping.
  if (!numbered) return out.join('\n');
  return out.map((text, i) => (i === 0 ? text : `   ${text}`)).join('\n');
}

/** The closing total, kept honest about anything that still needs quoting. */
function describeTotal(cart) {
  const { total, unpriced, priced } = cartTotal(cart);
  if (!priced) return 'Total: to confirm';
  if (!unpriced) return `Total: ${money(total)}`;
  return `Total so far: ${money(total)} (+ ${unpriced} item${unpriced === 1 ? '' : 's'} to price)`;
}

// Postage depends on where it is going and how big the box ends up, so it is
// never part of the total the storefront can work out. Saying so in the message
// keeps the total from reading as the final bill.
const SHIPPING_NOTE = 'Shipping to be confirmed.';

/**
 * The pre-filled chat message for a cart. Returns null for an empty cart, so
 * the order button opens a plain chat rather than putting words in the
 * customer's mouth.
 */
export function cartMessage(cart) {
  if (!cart?.length) return null;

  const opening = cart.length === 1 ? "Hi Clarky, I'd like to order this print:" : "Hi Clarky, I'd like to order:";

  if (cart.length > MAX_DETAILED_LINES) {
    const list = cart.map((line, i) => {
      const detail = [summariseOptions(line.options), summariseColours(line.colours)]
        .filter(Boolean)
        .join(', ');
      return `${i + 1}. ${line.name}${line.qty > 1 ? ` × ${line.qty}` : ''}${detail ? ` — ${detail}` : ''}`;
    });
    return [opening, '', ...list, '', describeTotal(cart), SHIPPING_NOTE].join('\n');
  }

  const blocks = cart.map((line, i) => describeLine(line, cart.length > 1 ? i + 1 : 0));
  return [opening, '', blocks.join('\n\n'), '', describeTotal(cart), SHIPPING_NOTE].join('\n');
}

/** Telegram deep link, pre-filled with the cart when there is one. */
export function cartLink(cart) {
  const message = cartMessage(cart);
  return message ? `${TELEGRAM_URL}?text=${encodeURIComponent(message)}` : TELEGRAM_URL;
}
