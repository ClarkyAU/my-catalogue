import { useState } from 'react';
import { api } from '../api.js';
import { useCatalogueStore } from '../useCatalogueTree.js';
import { Splash } from './Splash.jsx';
import { CategoryBlock } from './CategoryBlock.jsx';

// The catalogue itself: every category, its sections, and the products in them.
// This is the page that gets worked in, so it is the only thing on it — the site
// text, the watermark and the home page order all used to sit above it and had
// to be scrolled past to reach the first category.
export function CataloguePage() {
  const { tree, loading, reload } = useCatalogueStore();
  const [newCat, setNewCat] = useState('');

  const addCategory = async (e) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    await api('/categories', { method: 'POST', body: { displayName: newCat.trim() } });
    setNewCat('');
    reload();
  };

  return (
    <>
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
    </>
  );
}
