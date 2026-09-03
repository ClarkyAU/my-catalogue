import { useState } from 'react';
import { useCatalogueTree, CatalogueStoreProvider } from '../useCatalogueTree.js';
import { SiteSettings } from './SiteSettings.jsx';
import { CataloguePage } from './CataloguePage.jsx';
import { FeaturedOrder } from './FeaturedOrder.jsx';
import { FilamentManager } from './FilamentManager.jsx';

// One tab per job, rather than one long page.
//
// The catalogue page had grown a stack of things that were not the catalogue:
// the site's welcome text, the watermark settings and their preview, and the
// home page's running order — all above the first category, all needing to be
// scrolled past to get to the work. They are separate jobs done at separate
// times, so they are separate pages now. Ordered by how often each is opened,
// with the settings that are set once at the end.
const PAGES = [
  { id: 'catalogue', label: 'CATALOGUE' },
  { id: 'featured', label: 'FEATURED' },
  { id: 'filaments', label: 'FILAMENTS' },
  { id: 'settings', label: 'SETTINGS' },
];

export function Dashboard({ user, onSignOut }) {
  // The catalogue tree is loaded once here and shared with every page below
  // through the store context, so switching tabs does not refetch it.
  const store = useCatalogueTree();
  const { error } = store;
  const [page, setPage] = useState('catalogue');

  return (
    <div className="a-shell">
      <header className="a-topbar">
        <span className="a-brand">CLARKY3D<span>_ADMIN</span></span>
        <nav className="a-nav">
          {PAGES.map(({ id, label }) => (
            <button
              key={id}
              className={`a-nav-btn ${page === id ? 'is-active' : ''}`}
              onClick={() => setPage(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="a-topbar-right">
          <a className="a-link" href="/" target="_blank" rel="noreferrer">view site ↗</a>
          <span className="a-muted a-hide-sm">{user.email}</span>
          <button className="a-btn a-btn-sm" onClick={onSignOut}>SIGN OUT</button>
        </div>
      </header>

      <CatalogueStoreProvider value={store}>
        <main className="a-main">
          {/* Anything that went wrong loading or saving the tree, shown on
              whichever page is open when it happens. */}
          {error && <p className="a-error">{error}</p>}

          {page === 'catalogue' && <CataloguePage />}
          {page === 'featured' && <FeaturedOrder />}
          {page === 'filaments' && <FilamentManager />}
          {page === 'settings' && <SiteSettings />}
        </main>
      </CatalogueStoreProvider>
    </div>
  );
}
