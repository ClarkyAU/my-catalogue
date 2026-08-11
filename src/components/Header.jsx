import { CascadeMenu } from './CascadeMenu';
import { CartIcon } from './Icons';

// The site's one bar: wordmark on the left, the three routes and the cart on the
// right, a rule underneath. It sticks to the top of the window, which is what
// lets the cart move in here from the floating button it used to be — the cart
// is still always one tap away, but it no longer sits on top of the page.
//
// The wordmark is the only place the pixel face runs at any size. Everything
// else in the bar is monospace at label size.
export const Header = ({ catalogue, navigateTo, active, cartCount = 0, onOpenCart }) => (
  <header className="site-header">
    <div className="header-inner">
      <a className="wordmark" href="#">
        CLARKY<span>3D</span>
      </a>

      <nav className="topnav" aria-label="Main">
        <button
          type="button"
          className={`nav-btn ${active === 'featured' ? 'active' : ''}`}
          onClick={() => {
            window.location.hash = '';
          }}
        >
          Featured
        </button>

        <CascadeMenu
          catalogue={catalogue}
          navigateTo={navigateTo}
          active={active === 'catalogue'}
        />

        <button
          type="button"
          className={`nav-btn ${active === 'colours' ? 'active' : ''}`}
          onClick={() => {
            window.location.hash = 'colours';
          }}
        >
          Colours
        </button>

        <button
          type="button"
          className="cart-btn"
          onClick={onOpenCart}
          aria-label={
            cartCount
              ? `Open cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`
              : 'Open cart'
          }
        >
          <CartIcon />
          <span className="cart-btn-label">Cart</span>
          {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
        </button>
      </nav>
    </div>
  </header>
);
