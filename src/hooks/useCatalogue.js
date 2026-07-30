import { useState, useEffect } from 'react';
import { WATERMARK_DEFAULTS } from '../lib/watermark';

const DEFAULT_THEME = { themeColor: '#00E5FF' };

// Fallback copy so the landing page always has intro text, even before the
// bootstrap request responds or if it is briefly unavailable. The watermark
// defaults come from the shared module the admin preview uses too.
const DEFAULT_SETTINGS = {
  landingIntro: 'I am currently working on a batch of new products, so keep an eye out for updates.',
  landingSubtext: 'Check out the latest releases below, or hit [ MY CATALOGUE ] above to browse every category and product.',
  landingNote: 'If there is anything you would like that is not listed, shoot me a message via the order button.',
  ...WATERMARK_DEFAULTS,
};

const hasContent = (data) => data && typeof data === 'object' && Object.keys(data).length > 0;

export const useCatalogue = () => {
  const [catalogue, setCatalogue] = useState({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSubCategory, setActiveSubCategory] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeTheme, setActiveTheme] = useState(DEFAULT_THEME);
  const [activeColours, setActiveColours] = useState(false);

  // One request for both the catalogue and the editable site copy. There is no
  // bundled fallback catalogue: a snapshot goes stale the moment the owner
  // edits anything in the admin portal, and it has no notion of hidden
  // listings, so falling back to it could put a withdrawn product back on the
  // storefront. If the request fails the page says so instead.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/bootstrap')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (hasContent(data?.catalogue)) {
          setCatalogue(data.catalogue);
          if (hasContent(data.settings)) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
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

  return { catalogue, settings, loading, failed, activeCategory, activeSubCategory, activeProduct, activeTheme, activeColours, navigateTo };
};
