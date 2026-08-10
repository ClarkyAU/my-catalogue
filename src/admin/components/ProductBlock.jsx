import { useState } from 'react';
import { api } from '../api.js';
import { useCatalogueStore } from '../useCatalogueTree.js';
import { MAX_COLOUR_PARTS, MAX_PART_NAME, samePartList } from '../../lib/colourParts.js';
import { PhotoGrid } from './PhotoGrid.jsx';

// One product listing: its fields, the New/Popular/Featured/Hidden ticks, where
// it lives in the catalogue, and its photos.
export function ProductBlock({ product, currentSubcategoryId }) {
  const { tree: categories, reload, patchProduct } = useCatalogueStore();
  const [name, setName] = useState(product.displayName);
  const [price, setPrice] = useState(product.price);
  const [featured, setFeatured] = useState(product.featured);
  const [badge, setBadge] = useState(product.badge || 'none');
  const [hidden, setHidden] = useState(Boolean(product.hidden));
  const [description, setDescription] = useState(product.description || '');
  // The pieces of this print that can each be a different colour. Empty means
  // the whole thing prints in one colour.
  const [parts, setParts] = useState(product.colourParts || []);
  const initialCategoryId = categories.find((category) =>
    category.subcategories.some((subcategory) => subcategory.id === currentSubcategoryId))?.id;
  const [categoryId, setCategoryId] = useState(initialCategoryId || categories[0]?.id || '');
  const [subcategoryId, setSubcategoryId] = useState(currentSubcategoryId);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const destinationSubcategories =
    categories.find((category) => category.id === Number(categoryId))?.subcategories || [];

  const moving = subcategoryId !== currentSubcategoryId;

  const dirty =
    name !== product.displayName ||
    price !== product.price ||
    featured !== product.featured ||
    badge !== (product.badge || 'none') ||
    hidden !== Boolean(product.hidden) ||
    description !== (product.description || '') ||
    !samePartList(parts, product.colourParts || []) ||
    moving;

  const setPart = (index, value) =>
    setParts((current) => current.map((part, i) => (i === index ? value : part)));

  const removePart = (index) => setParts((current) => current.filter((_, i) => i !== index));

  const selectCategory = (value) => {
    const nextCategoryId = Number(value);
    const nextSubcategories = categories.find((category) => category.id === nextCategoryId)?.subcategories || [];
    setCategoryId(nextCategoryId);
    setSubcategoryId(nextSubcategories[0]?.id || '');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const row = await api(`/products/${product.id}`, {
        method: 'PATCH',
        body: {
          displayName: name, price, featured, badge, hidden, description,
          colourParts: parts, subcategoryId,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      // The server drops blank and duplicated part names, so take its word for
      // what was stored rather than leaving a row here that was never saved.
      setParts(row.colourParts || []);
      // Moving the product to another subcategory changes the shape of the tree,
      // so that case still needs a refetch. A plain field edit does not — the
      // saved row is enough to update this listing in place.
      if (moving) await reload();
      else patchProduct(row);
    } catch (err) {
      setError(err.message || 'Could not save the product.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete product "${product.displayName}"?`)) return;
    await api(`/products/${product.id}`, { method: 'DELETE' });
    reload();
  };

  return (
    <div className={`a-prod ${product.hidden ? 'is-hidden' : ''}`}>
      {product.hidden && (
        <div className="a-prod-flags">
          <span className="a-hidden-tag">HIDDEN FROM STORE</span>
        </div>
      )}

      <div className="a-prod-fields">
        <label className="a-field">
          <span>Name</span>
          <input className="a-input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="a-field a-field-price">
          <span>Price ($)</span>
          <input className="a-input" type="number" step="0.01" min="0" value={price}
            onChange={(e) => setPrice(e.target.value)} />
        </label>
        <div className="a-prod-ticks">
          <label className="a-field a-field-featured">
            <span>Featured</span>
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
          </label>
          <label className="a-field a-field-featured">
            <span>New</span>
            <input type="checkbox" checked={badge === 'new'}
              onChange={(e) => setBadge(e.target.checked ? 'new' : 'none')} />
          </label>
          <label className="a-field a-field-featured a-field-pop">
            <span>Popular</span>
            <input type="checkbox" checked={badge === 'popular'}
              onChange={(e) => setBadge(e.target.checked ? 'popular' : 'none')} />
          </label>
          <label className="a-field a-field-featured">
            <span>Hidden</span>
            <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
          </label>
        </div>
      </div>
      <p className="a-location-note a-prod-note">
        Tick New or Popular to stamp that watermark over this item's preview on the Featured Items page —
        an item carries one mark, so ticking one clears the other. Hiding it keeps the listing here but
        takes it off the storefront entirely.
      </p>

      <label className="a-field">
        <span>Description</span>
        <textarea className="a-input a-textarea" rows={5} value={description}
          onChange={(e) => setDescription(e.target.value)} />
      </label>

      <div className="a-parts">
        <div className="a-parts-head">
          <span>Colourable parts</span>
          <button
            className="a-btn a-btn-sm"
            onClick={() => setParts((current) => [...current, ''])}
            disabled={parts.length >= MAX_COLOUR_PARTS}
          >
            + ADD PART
          </button>
        </div>
        {parts.length > 0 && (
          <ol className="a-parts-list">
            {parts.map((part, index) => (
              // Keyed by position: these rows are a plain ordered list with no
              // identity of their own, and the name is what is being edited.
              <li key={index} className="a-parts-row">
                <span className="a-parts-index">{index + 1}</span>
                <input
                  className="a-input"
                  value={part}
                  maxLength={MAX_PART_NAME}
                  placeholder="e.g. Lid"
                  onChange={(e) => setPart(index, e.target.value)}
                />
                <button
                  className="a-btn a-btn-sm a-danger"
                  onClick={() => removePart(index)}
                  aria-label={`Remove part ${index + 1}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
        )}
        <p className="a-location-note">
          {parts.length > 0
            ? 'The storefront asks for a colour for each part in this order, one at a time, and lists every choice on the order. Leave this empty for a print that comes in a single colour.'
            : 'Only for prints made of pieces that can each be a different colour — add one row per piece (Lid, Body, Base) and the storefront will ask for a colour for each. Leave it empty for a single-colour print.'}
        </p>
      </div>

      <div className="a-prod-location">
        <label className="a-field">
          <span>Category</span>          <select className="a-input" value={categoryId} onChange={(e) => selectCategory(e.target.value)}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.displayName}</option>
            ))}
          </select>
        </label>
        <label className="a-field">
          <span>Subcategory</span>
          <select className="a-input" value={subcategoryId} onChange={(e) => setSubcategoryId(Number(e.target.value))}>
            {destinationSubcategories.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>{subcategory.displayName}</option>
            ))}
          </select>
        </label>
        <p className="a-location-note">Saving moves this product to the selected location.</p>
      </div>

      <PhotoGrid product={product} />

      {error && <p className="a-error a-action-error">{error}</p>}

      <div className="a-prod-actions">
        <button className="a-btn a-btn-sm" onClick={save} disabled={!dirty || saving || !subcategoryId}>
          {saving ? 'SAVING…' : saved ? 'SAVED ✓' : 'SAVE CHANGES'}
        </button>
        <div className="a-spacer" />
        <button className="a-btn a-btn-sm a-danger" onClick={remove}>DELETE PRODUCT</button>
      </div>
    </div>
  );
}
