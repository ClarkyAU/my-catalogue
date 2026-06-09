import { useState, useEffect } from 'react';
import catalogueData from '../data/catalogue.json';

export const useCatalogue = () => {
  const [catalogue] = useState(catalogueData);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSubCategory, setActiveSubCategory] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeTheme, setActiveTheme] = useState({ themeColor: '#00E5FF' });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) {
        setActiveCategory(null); setActiveSubCategory(null); setActiveProduct(null);
        setActiveTheme({ themeColor: '#00E5FF' }); return;
      }

      const [catId, subId, prodId] = hash.split('/');

      if (catalogue[catId]) {
        setActiveCategory(catId);
        setActiveTheme(catalogue[catId].theme || { themeColor: '#00E5FF' });
        if (subId && catalogue[catId].subCategories[subId]) {
          setActiveSubCategory(subId);
          if (prodId && catalogue[catId].subCategories[subId].products[prodId]) {
            setActiveProduct(prodId);
          } else { setActiveProduct(null); }
        } else { setActiveSubCategory(null); setActiveProduct(null); }
      } else {
        setActiveCategory(null); setActiveSubCategory(null); setActiveProduct(null);
        setActiveTheme({ themeColor: '#00E5FF' });
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); 
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [catalogue]);

  const navigateTo = (catId, subId, prodId) => {
    let path = '';
    if (catId) path += catId;
    if (subId) path += `/${subId}`;
    if (prodId) path += `/${prodId}`;
    window.location.hash = path;
  };

  return { catalogue, activeCategory, activeSubCategory, activeProduct, activeTheme, navigateTo };
};