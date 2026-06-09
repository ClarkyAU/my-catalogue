import React, { useState } from 'react';
import './styles/global.css';
import { useCatalogue } from './hooks/useCatalogue';
import { Header } from './components/Header';
import { ProductDisplay } from './components/ProductDisplay';
import { LandingPage } from './components/LandingPage';
import { CategoryGrid } from './components/CategoryGrid';
import { DirectoryOverlay } from './components/DirectoryOverlay';

export default function App() {
  const { catalogue, activeCategory, activeSubCategory, activeProduct, activeTheme, navigateTo } = useCatalogue();
  const [isDirOpen, setIsDirOpen] = useState(false);

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
            <button className="nav-btn hub-btn" onClick={() => setIsDirOpen(true)}>
              [ THE CATALOGUE ]
            </button>
            <button className="nav-btn hub-btn" onClick={(e) => { e.preventDefault(); alert("Colours Library Coming Soon!"); }}>
              [ COLOURS ]
            </button>
          </nav>
        </div>

        <DirectoryOverlay 
          catalogue={catalogue} 
          isOpen={isDirOpen} 
          onClose={() => setIsDirOpen(false)} 
          navigateTo={navigateTo} 
        />
        
        {!activeCategory ? (
          <LandingPage catalogue={catalogue} />
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