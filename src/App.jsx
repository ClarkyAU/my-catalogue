// Build v1.0.1
import React from 'react';
import './styles/global.css';
import { useCatalogue } from './hooks/useCatalogue';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { Gallery } from './components/Gallery';
import { ProductInfo } from './components/ProductInfo';

export default function App() {
  const { catalogue, activeCategory, activeProduct, activeTheme, navigateTo } = useCatalogue();
  const currentProduct = catalogue[activeCategory]?.products[activeProduct];

  return (
    <div className="app-container" style={{ '--theme-color': activeTheme.themeColor }}>
      <Header />
      
      <div className="main-wrapper">
        <Navigation 
          catalogue={catalogue} 
          activeCategory={activeCategory} 
          activeProduct={activeProduct} 
          navigateTo={navigateTo} 
        />

        {currentProduct && (
          <main className="product-card">
            <Gallery photos={currentProduct.photos} />
            <ProductInfo 
              title={currentProduct.displayName} 
              description={currentProduct.description} 
            />
          </main>
        )}
      </div>

      {/* Order Button */}
      <a href="https://t.me/Clarky_AU" target="_blank" rel="noopener noreferrer" style={{ position: 'fixed', right: '30px', bottom: '30px', backgroundColor: '#1A1A1A', border: '3px solid #26A5E4', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '8px 8px 0px #000', zIndex: 9999, textDecoration: 'none' }}>
        <span style={{ fontFamily: '"Space Mono", monospace', fontWeight: 'bold', color: '#26A5E4' }}>ORDER VIA</span>
      </a>
    </div>
  );
}