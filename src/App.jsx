import './styles/global.css';
import { useCatalogue } from './hooks/useCatalogue';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { ProductDisplay } from './components/ProductDisplay';

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
        {currentProduct && <ProductDisplay product={currentProduct} />}
      </div>
      <a href="https://t.me/Clarky_AU" className="order-fab" target="_blank" rel="noreferrer">
        ORDER VIA
      </a>
    </div>
  );
}