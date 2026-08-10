import { useEffect } from 'react';
import { CartIcon, TelegramIcon } from './Icons';
import { ANY_COLOUR, ColourSwatch } from './ColourPicker';
import { cartLink, TELEGRAM_URL } from '../lib/telegram.js';
import { cartTotal, clearCart, colourLabel, money, removeLine, setQty, useCart } from '../lib/cart.js';
import { imageUrl, srcSet } from '../lib/photos.js';
import { useFocusTrap } from '../hooks/useFocusTrap.js';

// Cart thumbnails are 72px squares (60px on a narrow screen), so they are
// fetched at that size instead of pulling the full-resolution upload.
const THUMB_SIZE = { w: 72, h: 72 };

// The cart, as a panel over the storefront rather than a page of its own, so
// nobody loses their place in the catalogue while checking what they have
// picked up. Ordering is still one message to Clarky — this just lets that
// message carry several prints instead of one.
export const CartPanel = ({ open, onClose }) => {
  const cart = useCart();
  const { total, unpriced, priced } = cartTotal(cart);
  // Focus starts on the close button (the panel's first control) and goes back
  // to the cart button when the panel closes.
  const panelRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    // The catalogue behind the panel should not scroll under it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="cart-overlay" onClick={onClose}>
      {/* Clicks inside the panel are the panel's own business. */}
      <aside
        className="cart-panel"
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="cart-head">
          <h2 className="cart-title">
            <CartIcon /> YOUR CART
          </h2>
          <button className="cart-close" onClick={onClose} aria-label="Close cart">
            ✕
          </button>
        </header>

        {cart.length === 0 ? (
          <div className="cart-empty">
            <p>Nothing in the cart yet.</p>
            <p className="cart-empty-hint">
              Browse the catalogue and add the prints you want — then send them all to Clarky in one
              message.
            </p>
            <a className="share-btn" href={TELEGRAM_URL} target="_blank" rel="noreferrer">
              <TelegramIcon />
              MESSAGE CLARKY
            </a>
          </div>
        ) : (
          <>
            <ul className="cart-lines">
              {cart.map((line) => {
                const value = Number(line.price);
                const linePriced =
                  line.price && line.price !== '0.00' && Number.isFinite(value);
                const where = [line.categoryName, line.subCategoryName].filter(Boolean).join(' / ');
                // A print coloured in pieces gets a row per piece, so the cart
                // shows the same breakdown the order message will carry.
                const colours = line.colours?.length ? line.colours : [{ part: null, colour: null }];

                return (
                  <li key={line.key} className="cart-line">
                    <a className="cart-line-thumb" href={`#${line.path}`} onClick={onClose}>
                      {line.photo ? (
                        <img
                          src={imageUrl(line.photo, THUMB_SIZE)}
                          srcSet={srcSet(line.photo, THUMB_SIZE)}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className="cart-line-thumb-ph">▢</span>
                      )}
                    </a>

                    <div className="cart-line-main">
                      <a className="cart-line-name" href={`#${line.path}`} onClick={onClose}>
                        {line.name}
                      </a>
                      {where && <span className="cart-line-where">{where}</span>}
                      {/* How this one was built, above the colours, matching the
                          order the product page asked and the order message
                          lists. There is no swatch for these, so the choice
                          carries the line on its own. */}
                      {(line.options || []).map((option) => (
                        <span key={option.name} className="cart-line-option">
                          <span className="cart-line-part">{option.name}</span>
                          {option.choice}
                        </span>
                      ))}
                      {colours.map((slot, i) => (
                        <span key={slot.part || i} className="cart-line-colour">
                          <ColourSwatch colour={slot.colour} className="cart-line-swatch" />
                          {slot.part && <span className="cart-line-part">{slot.part}</span>}
                          {colourLabel(slot.colour) || ANY_COLOUR}
                        </span>
                      ))}
                    </div>

                    <div className="cart-line-side">
                      <span className={`cart-line-price ${linePriced ? '' : 'to-price'}`}>
                        {linePriced ? money(value * line.qty) : 'TO PRICE'}
                      </span>
                      <div className="qty-stepper">
                        <button
                          type="button"
                          onClick={() => setQty(line.key, line.qty - 1)}
                          aria-label={`One fewer ${line.name}`}
                        >
                          −
                        </button>
                        <span className="qty-value" aria-live="polite">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(line.key, line.qty + 1)}
                          aria-label={`One more ${line.name}`}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="cart-line-remove"
                        onClick={() => removeLine(line.key)}
                        aria-label={`Remove ${line.name} from cart`}
                      >
                        REMOVE
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <footer className="cart-foot">
              <div className="cart-total">
                <span className="cart-total-label">{unpriced ? 'TOTAL SO FAR' : 'TOTAL'}</span>
                {/* The only place on the site that names the currency. Prices
                    are quoted in Australian dollars everywhere, but this is the
                    figure someone is about to act on, so it is the one place
                    worth being explicit — and it stays off "TO CONFIRM", which
                    is not an amount. */}
                <span className="cart-total-value">
                  {priced ? (
                    <>
                      {money(total)} <span className="cart-total-currency">AUD</span>
                    </>
                  ) : (
                    'TO CONFIRM'
                  )}
                </span>
              </div>
              {/* Postage depends on where it is going and how big the box ends
                  up, so the total above is for the prints only. */}
              <div className="cart-shipping">
                <span>SHIPPING</span>
                <span>TO BE CALCULATED</span>
              </div>
              {unpriced > 0 && (
                <p className="cart-note">
                  {unpriced === 1 ? '1 item is' : `${unpriced} items are`} priced in the chat — Clarky
                  will quote {unpriced === 1 ? 'it' : 'them'} when you message.
                </p>
              )}

              {/* The message is pre-filled; the customer still presses send. */}
              <a className="order-btn cart-order" href={cartLink(cart)} target="_blank" rel="noreferrer">
                <TelegramIcon />
                ORDER ON TELEGRAM
              </a>
              <p className="cart-note">
                Opens Telegram with your order written out. Nothing is sent until you press send.
              </p>
              <button type="button" className="cart-clear" onClick={clearCart}>
                CLEAR CART
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
};
