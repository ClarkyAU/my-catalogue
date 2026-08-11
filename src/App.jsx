import './styles/global.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCatalogue } from './hooks/useCatalogue';
import { Header } from './components/Header';
import { ProductDisplay } from './components/ProductDisplay';
import { LandingPage } from './components/LandingPage';
import { CategoryGrid } from './components/CategoryGrid';
import { CategoryPage } from './components/CategoryPage';
import { ColoursPage } from './components/ColoursPage';
import { CartPanel } from './components/CartPanel';
import { cartCount, useCart } from './lib/cart.js';
import { inkFor } from './lib/onAccent.js';
import { relatedProducts } from './lib/related.js';

const SITE_NAME = 'Clarky3D';

export default function App() {
  const { catalogue, settings, loading, failed, activeCategory, activeSubCategory, activeProduct, activeTheme, activeColours, navigateTo } = useCatalogue();
  const cart = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  // Target for the skip link below, so a keyboard user can get past the header
  // and the catalogue menu in one press.
  const mainRef = useRef(null);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const count = cartCount(cart);

  const currentCategory = activeCategory ? catalogue[activeCategory] : null;
  const currentSubCategory = activeCategory && activeSubCategory ? currentCategory?.subCategories[activeSubCategory] : null;
  const currentProduct = currentSubCategory && activeProduct ? currentSubCategory.products[activeProduct] : null;

  const productPath = currentProduct ? `${activeCategory}/${activeSubCategory}/${activeProduct}` : null;

  // Path below Home for the breadcrumb, built from whatever level is active.
  const trail = [];
  if (currentCategory) {
    trail.push({ label: currentCategory.displayName, hash: activeCategory });
    if (currentSubCategory) {
      trail.push({ label: currentSubCategory.displayName, hash: `${activeCategory}/${activeSubCategory}` });
      if (currentProduct) {
        trail.push({ label: currentProduct.displayName, hash: `${activeCategory}/${activeSubCategory}/${activeProduct}` });
      }
    }
  } else if (activeColours) {
    trail.push({ label: 'COLOURS', hash: 'colours' });
  }

  // The HTML document is only ever fetched once, and its <title> and canonical
  // URL may have been rewritten for a shared product link by the social-preview
  // edge function. Hash routing after that never reloads it, so both are kept in
  // step here: otherwise someone who opens a shared link and then browses on
  // keeps the first product's name in their tab, history and bookmarks, and a
  // search engine is told every route canonicalises to that one product.
  const pageLabel =
    currentProduct?.displayName ||
    currentSubCategory?.displayName ||
    currentCategory?.displayName ||
    (activeColours ? 'Colours' : null);

  useEffect(() => {
    // Until the catalogue arrives nothing is resolved yet, and overwriting the
    // title with the site name in the meantime would blank out an injected
    // product title and then put it straight back.
    if (loading) return;

    document.title = pageLabel ? `${pageLabel} — ${SITE_NAME}` : SITE_NAME;

    const canonical = document.querySelector('link[rel="canonical"]');
    // Only a full product route has a server-readable URL of its own; every
    // other view canonicalises to the storefront root.
    if (canonical) {
      canonical.href = productPath
        ? `${window.location.origin}/?p=${productPath}`
        : `${window.location.origin}/`;
    }
  }, [loading, pageLabel, productPath]);

  const themeColor = activeTheme?.themeColor || '#00E5FF';

  // Which of the three routes the header should light up.
  const activeRoute = activeColours ? 'colours' : activeCategory ? 'catalogue' : 'featured';

  return (
    // Two variables reach the whole storefront from here: the category's accent,
    // and the ink that reads on top of a fill of it. The second is derived rather
    // than fixed because a dark accent (Hotwheels red, Pep Things purple) does
    // not carry the near-black the buttons used to hardcode.
    <div
      className="app-container"
      style={{ '--theme-color': themeColor, '--on-accent': inkFor(themeColor) }}
    >
      {/* The app routes on the URL fragment, so the obvious href="#main" would be
          read as a catalogue route and drop the visitor back on the landing page.
          Moving focus directly does the same job without touching the URL. */}
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus();
        }}
      >
        SKIP TO CONTENT
      </a>
      <Header
        catalogue={catalogue}
        navigateTo={navigateTo}
        active={activeRoute}
        cartCount={count}
        onOpenCart={() => setCartOpen(true)}
      />
      <div className="main-wrapper">

        <main id="main" ref={mainRef} tabIndex={-1}>
          {loading ? (
            <p className="app-message">LOADING CATALOGUE...</p>
          ) : activeColours ? (
            <ColoursPage trail={trail} />
          ) : failed ? (
            // No bundled fallback catalogue any more, so say what happened rather
            // than showing an empty storefront or stale products.
            <div className="landing-empty">
              <h2>CATALOGUE UNAVAILABLE</h2>
              <p>Could not reach the catalogue just now. Please refresh in a moment.</p>
            </div>
          ) : !activeCategory ? (
            <LandingPage catalogue={catalogue} settings={settings} intro={settings.landingIntro} subtext={settings.landingSubtext} note={settings.landingNote} />
          ) : !activeSubCategory ? (
            <CategoryPage category={catalogue[activeCategory]} categoryId={activeCategory} trail={trail} />
          ) : !activeProduct ? (
            <CategoryGrid subCategory={currentSubCategory} categoryId={activeCategory} subCategoryId={activeSubCategory} trail={trail} />
          ) : (
            // Keyed on the product so the gallery remounts (and its selected photo
            // resets) when navigating between products.
            currentProduct && (
              <ProductDisplay
                key={activeProduct}
                product={currentProduct}
                trail={trail}
                path={productPath}
                categoryName={currentCategory.displayName}
                subCategoryName={currentSubCategory.displayName}
                categoryHref={`#${activeCategory}`}
                subCategoryHref={`#${activeCategory}/${activeSubCategory}`}
                related={relatedProducts(catalogue, activeCategory, activeSubCategory, activeProduct)}
              />
            )
          )}
        </main>

      </div>
      <CartPanel open={cartOpen} onClose={closeCart} />
    </div>
  );
}