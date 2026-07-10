import { useState, useEffect } from 'react';
// Bundled snapshot of the catalogue. Used as a fallback so the storefront —
// its menu, categories, and products — always renders even if the live API is
// briefly unavailable, rather than showing an empty page.
import fallbackCatalogue from '../data/catalogue.json';

const DEFAULT_THEME = { themeColor: '#00E5FF' };

// Fallback copy so the landing page always has intro text, even before the
// settings API responds or if it is briefly unavailable.
const DEFAULT_SETTINGS = {
  landingIntro: 'I am currently working on a batch of new products, so keep an eye out for updates.',
  landingSubtext: 'Check out the latest releases below, or hit [ MY CATALOGUE ] above to browse every category and product.',
  landingNote: 'If there is anything you would like that is not listed, shoot me a message via the order button.',
};

const hasContent = (data) => data && typeof data === 'object' && Object.keys(data).length > 0;

export const useCatalogue = () => {
  const [catalogue, setCatalogue] = useState({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSubCategory, setActiveSubCategory] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeTheme, setActiveTheme] = useState(DEFAULT_THEME);
  const [activeColours, setActiveColours] = useState(false);

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

  // Load editable site copy (e.g. the landing intro). Falls back to the bundled
  // defaults on any error so the page never renders blank text.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && hasContent(data)) setSettings({ ...DEFAULT_SETTINGS, ...data });
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);

      // Dedicated standalone page for the filament colour library.
      if (hash === 'colours') {
        setActiveColours(true);
        setActiveCategory(null); setActiveSubCategory(null); setActiveProduct(null);
        setActiveTheme(DEFAULT_THEME);
        return;
      }
      setActiveColours(false);

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

  return { catalogue, settings, loading, activeCategory, activeSubCategory, activeProduct, activeTheme, activeColours, navigateTo };
};
