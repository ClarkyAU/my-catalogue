import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const fetchTree = () => api('/catalogue').then((data) => data.categories || []);

/** Replace one category in the list, leaving every other branch untouched. */
const mapCategories = (cats, categoryId, fn) =>
  cats.map((cat) => (cat.id === categoryId ? fn(cat) : cat));

/**
 * The admin catalogue tree plus the helpers its UI needs.
 *
 * The `patch*` helpers each take whatever a PATCH returned — the scalar columns
 * of the saved row — and swap it into the tree, carrying the child collections
 * over from local state because the server's row does not include them and they
 * did not change. Untouched branches stay the exact same object so React can
 * skip re-rendering them.
 */
export function useCatalogueTree() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchTree()
      .then((cats) => {
        if (cancelled) return;
        setTree(cats);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Full refetch. Only needed when the *shape* of the tree changes — something
  // added, deleted, moved or reordered. Plain field edits patch in place below.
  const reload = useCallback(async () => {
    try {
      setTree(await fetchTree());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const patchCategory = useCallback((row) => {
    setTree((cats) =>
      mapCategories(cats, row.id, (cat) => ({ ...cat, ...row, subcategories: cat.subcategories })),
    );
  }, []);

  const patchSubcategory = useCallback((row) => {
    setTree((cats) =>
      cats.map((cat) => {
        if (!cat.subcategories.some((sub) => sub.id === row.id)) return cat;
        return {
          ...cat,
          subcategories: cat.subcategories.map((sub) =>
            sub.id === row.id ? { ...sub, ...row, products: sub.products } : sub,
          ),
        };
      }),
    );
  }, []);

  const patchProduct = useCallback((row) => {
    setTree((cats) =>
      cats.map((cat) => {
        const touched = cat.subcategories.some((sub) =>
          sub.products.some((prod) => prod.id === row.id),
        );
        if (!touched) return cat;
        return {
          ...cat,
          subcategories: cat.subcategories.map((sub) => {
            if (!sub.products.some((prod) => prod.id === row.id)) return sub;
            return {
              ...sub,
              products: sub.products.map((prod) =>
                prod.id === row.id ? { ...prod, ...row, photos: prod.photos } : prod,
              ),
            };
          }),
        };
      }),
    );
  }, []);

  const patchPhoto = useCallback((row) => {
    setTree((cats) =>
      cats.map((cat) => ({
        ...cat,
        subcategories: cat.subcategories.map((sub) => ({
          ...sub,
          products: sub.products.map((prod) => {
            if (!prod.photos.some((photo) => photo.id === row.id)) return prod;
            return {
              ...prod,
              // The photo PATCH response has no `url` (it is derived), so keep
              // the one already on screen.
              photos: prod.photos.map((photo) =>
                photo.id === row.id ? { ...photo, ...row, url: photo.url } : photo,
              ),
            };
          }),
        })),
      })),
    );
  }, []);

  return { tree, loading, error, setError, reload, patchCategory, patchSubcategory, patchProduct, patchPhoto };
}

const CatalogueStoreContext = createContext(null);

export const CatalogueStoreProvider = CatalogueStoreContext.Provider;

/** The shared tree plus its reload/patch helpers, from anywhere in the tree UI. */
export function useCatalogueStore() {
  const store = useContext(CatalogueStoreContext);
  if (!store) throw new Error('useCatalogueStore must be used inside a CatalogueStoreProvider');
  return store;
}
