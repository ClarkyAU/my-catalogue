import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const fetchFilaments = () => api('/filaments').then((data) => (Array.isArray(data) ? data : []));

/**
 * The filament library plus the helpers its UI needs. Mirrors
 * `useCatalogueTree`: a full refetch for anything that changes the list, and
 * in-place patches for plain field edits, where the server's response row is
 * already everything that changed.
 */
export function useFilaments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchFilaments()
      .then((rows) => {
        if (cancelled) return;
        setItems(rows);
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

  // Needed when the list itself changes: a colour added, deleted or reordered,
  // or an example print uploaded or removed.
  const reload = useCallback(async () => {
    try {
      setItems(await fetchFilaments());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // The stock groups are derived from each row's status, so even a status change
  // re-groups on its own. The response row has no `prints`, so keep the examples
  // already on screen.
  const patchFilament = useCallback((row) => {
    setItems((current) =>
      current.map((fil) => (fil.id === row.id ? { ...fil, ...row, prints: fil.prints } : fil)),
    );
  }, []);

  const patchPrint = useCallback((filamentId, row) => {
    setItems((current) =>
      current.map((fil) => {
        if (fil.id !== filamentId) return fil;
        return {
          ...fil,
          // As with product photos, `url` is derived and absent from the
          // response, so the existing one is carried over.
          prints: (fil.prints || []).map((print) =>
            print.id === row.id ? { ...print, ...row, url: print.url } : print,
          ),
        };
      }),
    );
  }, []);

  return { items, loading, error, setError, reload, patchFilament, patchPrint };
}

const FilamentStoreContext = createContext(null);

export const FilamentStoreProvider = FilamentStoreContext.Provider;

/** The shared filament library, from anywhere in the filament UI. */
export function useFilamentStore() {
  const store = useContext(FilamentStoreContext);
  if (!store) throw new Error('useFilamentStore must be used inside a FilamentStoreProvider');
  return store;
}
