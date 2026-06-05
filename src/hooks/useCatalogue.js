import { useState, useEffect } from 'react';
import catalogueData from '../data/catalogue.json';

export const useCatalogue = () => {
  const [catalogue] = useState(catalogueData);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeTheme, setActiveTheme] = useState({ themeColor: '#00E5FF' });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      
      // FIX: If there is no hash, stay on the landing page (null state).
      // This stops the app from automatically forcing a product to load.
      if (!hash) {
        setActiveCategory(null);
        setActiveProduct(null);
        setActiveTheme({ themeColor: '#00E5FF' });
        return;
      }

      const [catId, prodId] = hash.split('/');

      if (catalogue[catId]) {
        setActiveCategory(catId);
        setActiveTheme(catalogue[catId].theme || { themeColor: '#00E5FF' });
        if (prodId && catalogue[catId].products[prodId]) {
          setActiveProduct(prodId);
        } else {
          // If a category is selected but no product, prepare for the Category Grid
          setActiveProduct(null); 
        }
      } else {
        setActiveCategory(null);
        setActiveProduct(null);
        setActiveTheme({ themeColor: '#00E5FF' });
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Run on initial load

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [catalogue]);

  const navigateTo = (categoryId, productId) => {
    if (!categoryId) {
      window.location.hash = ''; // Returns home to New Products
    } else if (!productId) {
      window.location.hash = categoryId; // Opens Category Grid
    } else {
      window.location.hash = `${categoryId}/${productId}`; // Opens specific Product
    }
  };

  return { catalogue, activeCategory, activeProduct, activeTheme, navigateTo };
};