import './styles/global.css';
import { useCatalogue } from './hooks/useCatalogue';
import { Header } from './components/Header';
import { ProductDisplay } from './components/ProductDisplay';
import { LandingPage } from './components/LandingPage';
import { CategoryGrid } from './components/CategoryGrid';
import { CategoryPage } from './components/CategoryPage';
import { CascadeMenu } from './components/CascadeMenu';
import { ColoursPage } from './components/ColoursPage';
import { TelegramIcon } from './components/Icons';

export default function App() {
  const { catalogue, settings, loading, failed, activeCategory, activeSubCategory, activeProduct, activeTheme, activeColours, navigateTo } = useCatalogue();

  const currentCategory = activeCategory ? catalogue[activeCategory] : null;
  const currentSubCategory = activeCategory && activeSubCategory ? currentCategory?.subCategories[activeSubCategory] : null;
  const currentProduct = currentSubCategory && activeProduct ? currentSubCategory.products[activeProduct] : null;

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

  return (
    <div className="app-container" style={{ '--theme-color': activeTheme?.themeColor || '#00E5FF' }}>
      <Header />
      <div className="main-wrapper">
        
        <div className="nav-container">
          <nav className="nav-row main-hubs">
            <button className="nav-btn hub-btn" onClick={() => window.location.hash = ''}>
              [ FEATURED ITEMS ]
            </button>
            <CascadeMenu catalogue={catalogue} navigateTo={navigateTo} />
            <button className="nav-btn hub-btn" onClick={() => { window.location.hash = 'colours'; }}>
              [ COLOURS ]
            </button>
          </nav>
        </div>

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
          currentProduct && <ProductDisplay key={activeProduct} product={currentProduct} trail={trail} />
        )}

      </div>
      <a href="https://t.me/Clarky_AU" className="order-fab" target="_blank" rel="noreferrer">
        <TelegramIcon /> ORDER
      </a>
    </div>
  );
}