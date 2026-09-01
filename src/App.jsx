// The stylesheet is imported once, at the entry (src/main.jsx).
import { useEffect, useMemo, useRef } from 'react';
import { useCatalogue } from './hooks/useCatalogue';
import { Header } from './components/Header';
import { ProductDisplay } from './components/ProductDisplay';
import { LandingPage } from './components/LandingPage';
import { CategoryGrid } from './components/CategoryGrid';
import { CategoryPage } from './components/CategoryPage';
import { ColoursPage } from './components/ColoursPage';
import { CartPanel } from './components/CartPanel';
import { SearchOverlay } from './components/SearchOverlay';
import { SiteFooter } from './components/SiteFooter';
import { cartCount, useCart } from './lib/cart.js';
import { inkFor } from './lib/onAccent.js';
import { relatedProducts } from './lib/related.js';
import { useOverlay } from './hooks/useOverlay.js';
import { useScrollReset } from './hooks/useScrollReset.js';

const SITE_NAME = 'Clarky3D';

export default function App() {
  const { catalogue, settings, loading, failed, hash, activeCategory, activeSubCategory, activeProduct, activeTheme, activeColours, navigateTo } = useCatalogue();
  const cart = useCart();
  useScrollReset(hash);
  // Both panels are backed by a history entry, so the Android back button and
  // the iOS back-swipe close them instead of leaving the storefront.
  const cartPanel = useOverlay('cart');
  const search = useOverlay('search');
  // Target for the skip link below, so a keyboard user can get past the header
  // and the catalogue menu in one press.
  const mainRef = useRef(null);
  const count = cartCount(cart);

  // Desktop route into search. "/" is the near-universal shortcut for it and
  // Cmd/Ctrl-K the other one people try; both are ignored while the caret is in
  // a field, so typing a slash into the colour request still types a slash.
  const openSearch = search.open;
  useEffect(() => {
    const onKey = (event) => {
      const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName || '')
        || event.target?.isContentEditable;
      if (inField) return;
      const shortcut = event.key === '/' || ((event.metaKey || event.ctrlKey) && event.key === 'k');
      if (!shortcut) return;
      event.preventDefault();
      openSearch();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openSearch]);

  const currentCategory = activeCategory ? catalogue[activeCategory] : null;
  const currentSubCategory = activeCategory && activeSubCategory ? currentCategory?.subCategories[activeSubCategory] : null;
  const currentProduct = currentSubCategory && activeProduct ? currentSubCategory.products[activeProduct] : null;

  const productPath = currentProduct ? `${activeCategory}/${activeSubCategory}/${activeProduct}` : null;

  // Path below Home for the breadcrumb, built from whatever level is active.
  // Memoised along with the related-products row below it: both are rebuilt from
  // the whole catalogue, and this component re-renders on things that have
  // nothing to do with either of them — opening the cart, adding a line to it.
  const trail = useMemo(() => {
    const crumbs = [];
    if (currentCategory) {
      crumbs.push({ label: currentCategory.displayName, hash: activeCategory });
      if (currentSubCategory) {
        crumbs.push({ label: currentSubCategory.displayName, hash: `${activeCategory}/${activeSubCategory}` });
        if (currentProduct) {
          crumbs.push({ label: currentProduct.displayName, hash: `${activeCategory}/${activeSubCategory}/${activeProduct}` });
        }
      }
    } else if (activeColours) {
      crumbs.push({ label: 'COLOURS', hash: 'colours' });
    }
    return crumbs;
  }, [currentCategory, currentSubCategory, currentProduct, activeCategory, activeSubCategory, activeProduct, activeColours]);

  const related = useMemo(
    () => (currentProduct
      ? relatedProducts(catalogue, activeCategory, activeSubCategory, activeProduct)
      : undefined),
    [catalogue, currentProduct, activeCategory, activeSubCategory, activeProduct],
  );

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
        onOpenCart={cartPanel.open}
        onOpenSearch={search.open}
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
                related={related}
              />
            )
          )}
        </main>

      </div>
      <SiteFooter />
      <CartPanel
        open={cartPanel.isOpen}
        onClose={cartPanel.close}
        onNavigate={cartPanel.dismiss}
      />
      {search.isOpen && (
        <SearchOverlay
          catalogue={catalogue}
          onClose={search.close}
          onNavigate={search.dismiss}
        />
      )}
    </div>
  );
}