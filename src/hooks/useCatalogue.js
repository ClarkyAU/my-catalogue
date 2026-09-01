import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { WATERMARK_DEFAULTS } from '../lib/watermark';
import { primeFilaments } from '../lib/filaments';

const DEFAULT_THEME = { themeColor: '#00E5FF' };

// Fallback copy so the landing page always has intro text, even before the
// bootstrap request responds or if it is briefly unavailable. The watermark
// defaults come from the shared module the admin preview uses too.
const DEFAULT_SETTINGS = {
  landingIntro: 'I am currently working on a batch of new products, so keep an eye out for updates.',
  landingSubtext: 'Check out the latest releases below, or hit Catalogue in the bar above to browse every category and product.',
  landingNote: 'If there is anything you would like that is not listed, shoot me a message via the order button.',
  ...WATERMARK_DEFAULTS,
};

const hasContent = (data) => data && typeof data === 'object' && Object.keys(data).length > 0;

// The URL fragment is an external store, so it is read as one — the same way the
// cart is (see src/lib/cart.js). This replaced a listener that was attached
// inside an effect and re-attached on every catalogue update, and that had to
// call itself once on mount to catch a route it had missed. Subscribing properly
// means there is no window where the hash and the rendered route disagree, and
// the route below is derived during render rather than pushed into state by an
// effect.
const subscribeToHash = (onChange) => {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};
const getHash = () => window.location.hash.slice(1);
// Nothing renders on the server, but useSyncExternalStore wants a snapshot for
// it and an empty hash is the storefront root.
const getServerHash = () => '';

/**
 * Resolve a fragment against the catalogue. Pure, so it can run during render:
 * before the catalogue arrives every route falls through to the landing page,
 * and re-runs on its own the moment the tree lands.
 */
function resolveRoute(hash, catalogue) {
  const empty = {
    activeCategory: null,
    activeSubCategory: null,
    activeProduct: null,
    activeTheme: DEFAULT_THEME,
    activeColours: false,
  };

  // Dedicated standalone page for the filament colour library.
  if (hash === 'colours') return { ...empty, activeColours: true };
  if (!hash) return empty;

  const [catId, subId, prodId] = hash.split('/');
  const category = catalogue[catId];
  if (!category) return empty;

  const subCategory = subId ? category.subCategories?.[subId] : null;
  const product = subCategory && prodId ? subCategory.products?.[prodId] : null;

  return {
    activeCategory: catId,
    activeSubCategory: subCategory ? subId : null,
    activeProduct: product ? prodId : null,
    activeTheme: category.theme || DEFAULT_THEME,
    activeColours: false,
  };
}

const navigateTo = (catId, subId, prodId) => {
  let path = '';
  if (catId) path += catId;
  if (subId) path += `/${subId}`;
  if (prodId) path += `/${prodId}`;
  window.location.hash = path;
};

export const useCatalogue = () => {
  const [catalogue, setCatalogue] = useState({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // One request for the catalogue, the editable site copy and the filament
  // library — everything the first render needs. There is no bundled fallback
  // catalogue: a snapshot goes stale the moment the owner edits anything in the
  // admin portal, and it has no notion of hidden listings, so falling back to it
  // could put a withdrawn product back on the storefront. If the request fails
  // the page says so instead.
  //
  // index.html preloads this URL, so the response is usually already on its way
  // before this effect runs and the fetch resolves off the warmed entry rather
  // than opening a request of its own.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/bootstrap')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (hasContent(data?.catalogue)) {
          setCatalogue(data.catalogue);
          if (hasContent(data.settings)) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
          // Hand the colour library to the module every consumer reads it from,
          // so none of them has to go and fetch it separately.
          primeFilaments(data.filaments);
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

  const hash = useSyncExternalStore(subscribeToHash, getHash, getServerHash);
  const route = useMemo(() => resolveRoute(hash, catalogue), [hash, catalogue]);

  // `hash` is handed back so the scroll reset can key off the raw route (see
  // useScrollReset) without subscribing to the fragment a second time.
  return { catalogue, settings, loading, failed, hash, ...route, navigateTo };
};
