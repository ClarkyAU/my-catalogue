import { useState } from 'react';
import { api } from '../api.js';
import { useCatalogueStore } from '../useCatalogueTree.js';
import { SubcategoryBlock } from './SubcategoryBlock.jsx';

// One top-level category: its name, theme colour, and the subcategories inside
// it. Collapsible so a long catalogue stays scannable.
export function CategoryBlock({ category }) {
  const { reload, patchCategory } = useCatalogueStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.displayName);
  const [color, setColor] = useState(category.themeColor || '#00E5FF');
  const [newSub, setNewSub] = useState('');
  const [open, setOpen] = useState(true);
  const [addingSub, setAddingSub] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    try {
      // The PATCH response is the saved row, so the tree can be updated in
      // place instead of refetching the whole catalogue.
      const row = await api(`/categories/${category.id}`, {
        method: 'PATCH',
        body: { displayName: name, themeColor: color },
      });
      patchCategory(row);
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Could not save the category.');
    }
  };

  const remove = async () => {
    if (!confirm(`Delete category "${category.displayName}" and everything inside it?`)) return;
    await api(`/categories/${category.id}`, { method: 'DELETE' });
    reload();
  };

  const addSub = async (e) => {
    e.preventDefault();
    if (!newSub.trim()) return;
    setAddingSub(true);
    setError('');
    try {
      await api('/subcategories', { method: 'POST', body: { categoryId: category.id, displayName: newSub.trim() } });
      setNewSub('');
      await reload();
    } catch (err) {
      setError(err.message || 'Could not add the subcategory.');
    } finally {
      setAddingSub(false);
    }
  };

  return (
    <section className="a-cat" style={{ '--cat-color': color }}>
      <div className="a-cat-head">
        <button className="a-collapse" onClick={() => setOpen(!open)}>{open ? '▾' : '▸'}</button>
        {editing ? (
          <div className="a-inline-edit">
            <input className="a-input" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="a-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            <button className="a-btn a-btn-sm" onClick={save}>SAVE</button>
            <button className="a-btn a-btn-sm a-ghost" onClick={() => setEditing(false)}>CANCEL</button>
          </div>
        ) : (
          <>
            <span className="a-swatch" style={{ background: color }} />
            <h2 className="a-cat-title">{category.displayName}</h2>
            <div className="a-spacer" />
            <button className="a-btn a-btn-sm a-ghost" onClick={() => setEditing(true)}>EDIT</button>
            <button className="a-btn a-btn-sm a-danger" onClick={remove}>DELETE</button>
          </>
        )}
      </div>

      {open && (
        <div className="a-cat-body">
          {category.subcategories.map((sub) => (
            <SubcategoryBlock key={sub.id} sub={sub} />
          ))}
          <form className="a-addbar a-addbar-sub" onSubmit={addSub}>
            <input className="a-input" placeholder="New subcategory name…" value={newSub}
              onChange={(e) => setNewSub(e.target.value)} />
            <button className="a-btn a-btn-sm" type="submit" disabled={addingSub || !newSub.trim()}>
              {addingSub ? 'ADDING…' : '+ SUBCATEGORY'}
            </button>
          </form>
          {error && <p className="a-error a-action-error">{error}</p>}
        </div>
      )}
    </section>
  );
}
