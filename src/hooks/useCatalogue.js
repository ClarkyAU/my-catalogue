import { useState, useEffect } from 'react';
import catalogueData from '../data/catalogue.json';

export const useCatalogue = () => {
  const [catalogue, setCatalogue] = useState(catalogueData);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);
  
  const rawTheme = activeCategory && catalogueData[activeCategory]?.theme ? catalogueData[activeCategory].theme : {};
  const activeTheme = { 
    themeColor: rawTheme.themeColor || rawTheme.color || rawTheme.theme_color || '#00E5FF' 
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const [hashCat, hashProd] = hash.split('/');
      const categories = Object.keys(catalogueData);

      if (hashCat && catalogueData[hashCat]) {
        setActiveCategory(hashCat);
        if (hashProd && catalogueData[hashCat].products[hashProd]) {
          setActiveProduct(hashProd);
        } else {
          setActiveProduct(Object.keys(catalogueData[hashCat].products)[0]);
        }
      } else if (categories.length > 0) {
        const firstCat = categories[0];
        setActiveCategory(firstCat);
        const products = Object.keys(catalogueData[firstCat].products || {});
        if (products.length > 0) {
          setActiveProduct(products[0]);
        }
      }
    };

    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (activeCategory && activeProduct) {
      const currentHash = window.location.hash.replace('#', '');
      const newHash = `${activeCategory}/${activeProduct}`;
      if (currentHash !== newHash) {
        window.location.hash = newHash;
      }
    }
  }, [activeCategory, activeProduct]);

  const navigateTo = (categoryId, productId) => {
    setActiveCategory(categoryId);
    setActiveProduct(productId);
  };

  return {
    catalogue,
    activeCategory,
    activeProduct,
    activeTheme, 
    navigateTo
  };
};