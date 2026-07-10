import React from 'react';
import './styles/global.css';
import { useCatalogue } from './hooks/useCatalogue';
import { Header } from './components/Header';
import { ProductDisplay } from './components/ProductDisplay';
import { LandingPage } from './components/LandingPage';
import { CategoryGrid } from './components/CategoryGrid';
import { CategoryPage } from './components/CategoryPage';
import { CascadeMenu } from './components/CascadeMenu';
import { ColoursPage } from './components/ColoursPage';

export default function App() {
  const { catalogue, settings, loading, activeCategory, activeSubCategory, activeProduct, activeTheme, activeColours, navigateTo } = useCatalogue();

  const currentSubCategory = activeCategory && activeSubCategory ? catalogue[activeCategory]?.subCategories[activeSubCategory] : null;
  const currentProduct = currentSubCategory && activeProduct ? currentSubCategory.products[activeProduct] : null;

  return (
    <div className="app-container" style={{ '--theme-color': activeTheme?.themeColor || '#00E5FF' }}>
      <Header />
      <div className="main-wrapper">
        
        <div className="nav-container">
          <nav className="nav-row main-hubs">
            <button className="nav-btn hub-btn" onClick={() => window.location.hash = ''}>
              [ NEW PRODUCTS ]
            </button>
            <CascadeMenu catalogue={catalogue} navigateTo={navigateTo} />
            <button className="nav-btn hub-btn" onClick={() => { window.location.hash = 'colours'; }}>
              [ COLOURS ]
            </button>
          </nav>
        </div>

        {loading ? (
          <div className="landing-page" style={{ textAlign: 'center', marginTop: '60px', fontFamily: "'Space Mono', monospace", color: '#888' }}>
            LOADING CATALOGUE...
          </div>
        ) : activeColours ? (
          <ColoursPage />
        ) : !activeCategory ? (
          <LandingPage catalogue={catalogue} intro={settings.landingIntro} subtext={settings.landingSubtext} note={settings.landingNote} />
        ) : !activeSubCategory ? (
          <CategoryPage category={catalogue[activeCategory]} categoryId={activeCategory} />
        ) : !activeProduct ? (
          <CategoryGrid subCategory={currentSubCategory} categoryId={activeCategory} subCategoryId={activeSubCategory} />
        ) : (
          currentProduct && <ProductDisplay product={currentProduct} />
        )}
        
      </div>
      <a href="https://t.me/Clarky_AU" className="order-fab" target="_blank" rel="noreferrer">
        <i className="fa-brands fa-telegram"></i> ORDER
      </a>
    </div>
  );
}