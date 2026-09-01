import { TelegramIcon } from './Icons';
import { TELEGRAM_URL } from '../lib/telegram.js';

/**
 * The bottom of every page.
 *
 * There was no footer at all, but `.app-container` reserved 90px of bottom
 * padding for the floating cart button that has since moved into the header — so
 * every route ended in a band of empty scroll. The things that were only ever
 * said inside the cart, or only on a product page, are the things people look
 * for at the bottom of a shop: how to reach the owner, that nothing is held in
 * stock, and that postage is quoted rather than listed.
 */
export const SiteFooter = () => (
  <footer className="site-footer">
    <div className="footer-inner">
      <div className="footer-block">
        <span className="footer-label">CLARKY3D</span>
        <p className="footer-note">
          Every print is made to order in the colour you pick — nothing here is held on a shelf.
        </p>
      </div>

      <nav className="footer-block" aria-label="Footer">
        <span className="footer-label">BROWSE</span>
        <a className="footer-link" href="#">Featured items</a>
        <a className="footer-link" href="#colours">Colour library</a>
      </nav>

      <div className="footer-block">
        <span className="footer-label">ORDERING</span>
        <p className="footer-note">
          Orders and questions go through Telegram. Postage depends on the size of the box, so it is
          quoted in the chat.
        </p>
        <a className="footer-link strong" href={TELEGRAM_URL} target="_blank" rel="noreferrer">
          <TelegramIcon />
          Message Clarky
        </a>
      </div>
    </div>
  </footer>
);
