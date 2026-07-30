import { useState } from 'react';
import { api } from '../api.js';
import { useCatalogueStore } from '../useCatalogueTree.js';
import { ProductBlock } from './ProductBlock.jsx';

// One subcategory and the products inside it. Collapsed by default so a category
// with many subcategories stays scannable; opening one reveals its products.
export function SubcategoryBlock({ sub }) {
  const { reload, patchSubcategory } = useCatalogueStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(sub.displayName);
  const [adding, setAdding] = useState(false);
  const [newProd, setNewProd] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  const hiddenCount = sub.products.filter((prod) => prod.hidden).length;

  const save = async () => {
    setError('');
    try {
      const row = await api(`/subcategories/${sub.id}`, {
        method: 'PATCH',
        body: { displayName: name },
      });
      patchSubcategory(row);
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Could not save the subcategory.');
    }
  };

  const remove = async () => {
    if (!confirm(`Delete subcategory "${sub.displayName}" and its products?`)) return;
    await api(`/subcategories/${sub.id}`, { method: 'DELETE' });
    reload();
  };

  const addProduct = async (e) => {
    e.preventDefault();
    if (!newProd.trim()) return;
    await api('/products', { method: 'POST', body: { subcategoryId: sub.id, displayName: newProd.trim() } });
    setNewProd('');
    setAdding(false);
    reload();
  };

  return (
    <div className={`a-sub ${open ? 'is-open' : ''}`}>
      <div className="a-sub-head">
        <button
          className="a-collapse"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          title={open ? 'Collapse' : 'Expand'}
        >
          {open ? '▾' : '▸'}
        </button>
        {editing ? (
          <div className="a-inline-edit">
            <input className="a-input" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="a-btn a-btn-sm" onClick={save}>SAVE</button>
            <button className="a-btn a-btn-sm a-ghost" onClick={() => setEditing(false)}>CANCEL</button>
          </div>
        ) : (
          <>
            <h3 className="a-sub-title">{sub.displayName}</h3>
            <span className="a-count">
              {sub.products.length} item{sub.products.length === 1 ? '' : 's'}
              {hiddenCount > 0 && ` · ${hiddenCount} hidden`}
            </span>
            <div className="a-spacer" />
            <button className="a-btn a-btn-sm a-ghost" onClick={() => setEditing(true)}>EDIT</button>
            <button className="a-btn a-btn-sm a-danger" onClick={remove}>DELETE</button>
          </>
        )}
      </div>

      {error && <p className="a-error a-action-error">{error}</p>}

      {open && (
        <>
          <div className="a-products">
            {sub.products.map((prod) => (
              <ProductBlock key={prod.id} product={prod} currentSubcategoryId={sub.id} />
            ))}
          </div>

          {adding ? (
            <form className="a-addbar a-addbar-sub" onSubmit={addProduct}>
              <input className="a-input" placeholder="New product name…" value={newProd} autoFocus
                onChange={(e) => setNewProd(e.target.value)} />
              <button className="a-btn a-btn-sm" type="submit">CREATE</button>
              <button className="a-btn a-btn-sm a-ghost" type="button" onClick={() => setAdding(false)}>CANCEL</button>
            </form>
          ) : (
            <button className="a-btn a-btn-sm a-add-prod" onClick={() => setAdding(true)}>+ ADD PRODUCT</button>
          )}
        </>
      )}
    </div>
  );
}
