import { useState, useEffect } from 'react';
// Bundled snapshot of the catalogue. Used as a fallback so the storefront —
// its menu, categories, and products — always renders even if the live API is
// briefly unavailable, rather than showing an empty page.
import fallbackCatalogue from '../data/catalogue.json';

const DEFAULT_THEME = { themeColor: '#00E5FF' };

const hasContent = (data) => data && typeof data === 'object' && Object.keys(data).length > 0;

export const useCatalogue = () => {
  const [catalogue, setCatalogue] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSubCategory, setActiveSubCategory] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeTheme, setActiveTheme] = useState(DEFAULT_THEME);

  // Load the live catalogue from the API (backed by the database), but fall
  // back to the bundled snapshot on any error or empty response so the menu and
  // products never disappear.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/catalogue')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setCatalogue(hasContent(data) ? data : fallbackCatalogue);
      })
      .catch(() => {
        if (!cancelled) setCatalogue(fallbackCatalogue);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) {
        setActiveCategory(null); setActiveSubCategory(null); setActiveProduct(null);
        setActiveTheme(DEFAULT_THEME); return;
      }

      const [catId, subId, prodId] = hash.split('/');

      if (catalogue[catId]) {
        setActiveCategory(catId);
        setActiveTheme(catalogue[catId].theme || DEFAULT_THEME);
        if (subId && catalogue[catId].subCategories[subId]) {
          setActiveSubCategory(subId);
          if (prodId && catalogue[catId].subCategories[subId].products[prodId]) {
            setActiveProduct(prodId);
          } else { setActiveProduct(null); }
        } else { setActiveSubCategory(null); setActiveProduct(null); }
      } else {
        setActiveCategory(null); setActiveSubCategory(null); setActiveProduct(null);
        setActiveTheme(DEFAULT_THEME);
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

  return { catalogue, loading, activeCategory, activeSubCategory, activeProduct, activeTheme, navigateTo };
};
