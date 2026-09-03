import { TelegramIcon } from './Icons';
import { TELEGRAM_URL } from '../lib/telegram.js';

/**
 * The bottom of every page, and deliberately one line of it.
 *
 * It started as three columns: a made-to-order note, a list of routes, and how
 * ordering works. The routes were already in the bar at the top of every page
 * and the made-to-order note is already said on the landing page and on every
 * product, so most of what was down here was the page repeating itself at
 * smaller type. What survives is the one thing that is genuinely useful on the
 * way out and stated nowhere else: postage is worked out in the chat, and this
 * is the way into the chat.
 */
export const SiteFooter = () => (
  <footer className="site-footer">
    <div className="footer-inner">
      <span className="footer-label">CLARKY3D</span>
      <p className="footer-note">Made to order. Postage is quoted in the chat.</p>
      <a className="footer-link" href={TELEGRAM_URL} target="_blank" rel="noreferrer">
        <TelegramIcon />
        Message Clarky
      </a>
    </div>
  </footer>
);
