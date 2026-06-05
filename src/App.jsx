import './styles/global.css';
import { useCatalogue } from './hooks/useCatalogue';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { ProductDisplay } from './components/ProductDisplay';
import { LandingPage } from './components/LandingPage';
import { CategoryGrid } from './components/CategoryGrid';

export default function App() {
  const { catalogue, activeCategory, activeProduct, activeTheme, navigateTo } = useCatalogue();
  const currentProduct = activeCategory && activeProduct ? catalogue[activeCategory]?.products[activeProduct] : null;

  return (
    <div className="app-container" style={{ '--theme-color': activeTheme?.themeColor || '#00E5FF' }}>
      <Header />
      <div className="main-wrapper">
        <Navigation 
          catalogue={catalogue} 
          activeCategory={activeCategory} 
          activeProduct={activeProduct} 
          navigateTo={navigateTo} 
        />
        
        {/* Routing Logic: Show Landing Page if no category, Category Grid if no product, otherwise show Product */}
        {!activeCategory ? (
          <LandingPage catalogue={catalogue} />
        ) : !activeProduct ? (
          <CategoryGrid category={catalogue[activeCategory]} categoryId={activeCategory} />
        ) : (
          currentProduct && <ProductDisplay product={currentProduct} />
        )}
        
      </div>
      <a href="https://t.me/Clarky_AU" className="order-fab" target="_blank" rel="noreferrer">
        <i className="fa-brands fa-telegram"></i>
        ORDER
      </a>
    </div>
  );
}