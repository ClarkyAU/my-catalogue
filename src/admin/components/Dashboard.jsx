import { useState } from 'react';
import { api } from '../api.js';
import { useCatalogueTree, CatalogueStoreProvider } from '../useCatalogueTree.js';
import { Splash } from './Splash.jsx';
import { SiteSettings } from './SiteSettings.jsx';
import { CategoryBlock } from './CategoryBlock.jsx';
import { FilamentManager } from './FilamentManager.jsx';

// The signed-in control panel: site text and watermark settings, the category
// tree, and the filament colour library. The catalogue tree is loaded once here
// and shared with every block below through the store context.
export function Dashboard({ user, onSignOut }) {
  const store = useCatalogueTree();
  const { tree, loading, error, reload } = store;
  const [newCat, setNewCat] = useState('');
  const [page, setPage] = useState('catalogue'); // 'catalogue' | 'filaments'

  const addCategory = async (e) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    await api('/categories', { method: 'POST', body: { displayName: newCat.trim() } });
    setNewCat('');
    reload();
  };

  return (
    <div className="a-shell">
      <header className="a-topbar">
        <span className="a-brand">CLARKY3D<span>_ADMIN</span></span>
        <nav className="a-nav">
          <button
            className={`a-nav-btn ${page === 'catalogue' ? 'is-active' : ''}`}
            onClick={() => setPage('catalogue')}
          >
            CATALOGUE
          </button>
          <button
            className={`a-nav-btn ${page === 'filaments' ? 'is-active' : ''}`}
            onClick={() => setPage('filaments')}
          >
            FILAMENTS
          </button>
        </nav>
        <div className="a-topbar-right">
          <a className="a-link" href="/" target="_blank" rel="noreferrer">view site ↗</a>
          <span className="a-muted a-hide-sm">{user.email}</span>
          <button className="a-btn a-btn-sm" onClick={onSignOut}>SIGN OUT</button>
        </div>
      </header>

      <main className="a-main">
        {error && <p className="a-error">{error}</p>}

        {page === 'filaments' ? (
          <FilamentManager />
        ) : (
          <CatalogueStoreProvider value={store}>
            <SiteSettings />

            <form className="a-addbar" onSubmit={addCategory}>
              <input className="a-input" placeholder="New category name…" value={newCat}
                onChange={(e) => setNewCat(e.target.value)} />
              <button className="a-btn" type="submit">+ CATEGORY</button>
            </form>

            {loading ? (
              <Splash text="LOADING…" inline />
            ) : tree.length === 0 ? (
              <p className="a-muted">No categories yet. Add one above to get started.</p>
            ) : (
              tree.map((cat) => <CategoryBlock key={cat.id} category={cat} />)
            )}
          </CatalogueStoreProvider>
        )}
      </main>
    </div>
  );
}
