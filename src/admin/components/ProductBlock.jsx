import { useState } from 'react';
import { api } from '../api.js';
import { useCatalogueStore } from '../useCatalogueTree.js';
import { MAX_COLOUR_PARTS, MAX_PART_NAME, samePartList } from '../../lib/colourParts.js';
import {
  MAX_CHOICE_NAME,
  MAX_OPTION_CHOICES,
  MAX_OPTION_NAME,
  MAX_PRODUCT_OPTIONS,
  sameOptionList,
} from '../../lib/productOptions.js';
import {
  DEFAULT_CUSTOM_TEXT_LABEL,
  MAX_CUSTOM_TEXT_LABEL,
  customTextForm,
  sameCustomText,
} from '../../lib/customText.js';
import { PhotoGrid } from './PhotoGrid.jsx';

// One product listing: its fields, the New/Popular/Featured/Hidden ticks, where
// it lives in the catalogue, and its photos.
export function ProductBlock({ product, currentSubcategoryId }) {
  const { tree: categories, reload, patchProduct } = useCatalogueStore();
  const [name, setName] = useState(product.displayName);
  const [price, setPrice] = useState(product.price);
  const [featured, setFeatured] = useState(product.featured);
  const [badge, setBadge] = useState(product.badge || 'none');
  // Clarky's own design. Separate from the badge above rather than a third
  // choice within it, so a print can be new and in-house at the same time.
  const [designed, setDesigned] = useState(Boolean(product.clarkyDesigned));
  const [hidden, setHidden] = useState(Boolean(product.hidden));
  const [description, setDescription] = useState(product.description || '');
  // The pieces of this print that can each be a different colour. Empty means
  // the whole thing prints in one colour.
  const [parts, setParts] = useState(product.colourParts || []);
  // The other made-to-order choices this print offers: each row is a question
  // (Inlay, Lid, Logo) with the answers on offer. Empty means it is ordered
  // exactly as pictured.
  const [options, setOptions] = useState(product.options || []);
  // Whether this print carries a line of the customer's own words, and what to
  // call the question. Held as { enabled, label, required } so the wording
  // survives the box being switched off and on again.
  const [customText, setCustomText] = useState(() => customTextForm(product.customText));
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
    designed !== Boolean(product.clarkyDesigned) ||
    hidden !== Boolean(product.hidden) ||
    description !== (product.description || '') ||
    !samePartList(parts, product.colourParts || []) ||
    !sameOptionList(options, product.options || []) ||
    !sameCustomText(customText, customTextForm(product.customText)) ||
    moving;

  const setCustom = (changes) => setCustomText((current) => ({ ...current, ...changes }));

  const setPart = (index, value) =>
    setParts((current) => current.map((part, i) => (i === index ? value : part)));

  const removePart = (index) => setParts((current) => current.filter((_, i) => i !== index));

  // A question and its answers are edited in place; a new question starts with
  // two blank answers because one answer is not a choice.
  const patchOption = (index, changes) =>
    setOptions((current) =>
      current.map((option, i) => (i === index ? { ...option, ...changes } : option)),
    );

  const addOption = () =>
    setOptions((current) => [...current, { name: '', choices: ['', ''] }]);

  const removeOption = (index) =>
    setOptions((current) => current.filter((_, i) => i !== index));

  const setChoice = (index, choiceIndex, value) =>
    patchOption(index, {
      choices: options[index].choices.map((choice, i) => (i === choiceIndex ? value : choice)),
    });

  const addChoice = (index) =>
    patchOption(index, { choices: [...options[index].choices, ''] });

  const removeChoice = (index, choiceIndex) =>
    patchOption(index, { choices: options[index].choices.filter((_, i) => i !== choiceIndex) });

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
          clarkyDesigned: designed,
          colourParts: parts, options, subcategoryId,
          // Switched off is stored as "this print takes no text" rather than as
          // a disabled setting, so the storefront has one thing to check.
          customText: customText.enabled
            ? {
                label: customText.label.trim() || DEFAULT_CUSTOM_TEXT_LABEL,
                required: customText.required,
              }
            : null,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      // The server drops blank and duplicated part names, so take its word for
      // what was stored rather than leaving a row here that was never saved.
      setParts(row.colourParts || []);
      // Same for a question left half-filled: it is dropped on save, and showing
      // that straight away beats pretending it was kept.
      setOptions(row.options || []);
      // The label is trimmed and the length clamped on save, so show what was
      // actually stored.
      setCustomText(customTextForm(row.customText));
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
          <label className="a-field a-field-designed">
            <span>Clarky designed</span>
            <input type="checkbox" checked={designed} onChange={(e) => setDesigned(e.target.checked)} />
          </label>
          <label className="a-field a-field-featured">
            <span>Hidden</span>
            <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
          </label>
        </div>
      </div>
      <p className="a-location-note a-prod-note">
        Tick New or Popular to stamp that watermark over this item's preview on the Featured Items page —
        an item carries one mark, so ticking one clears the other. Clarky designed credits the print as
        your own work rather than someone else's model, and shows under its name wherever it appears, so
        it can be ticked alongside either watermark. Hiding it keeps the listing here but takes it off the
        storefront entirely.
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

      <div className="a-parts a-options">
        <div className="a-parts-head">
          <span>Other options</span>
          <button
            className="a-btn a-btn-sm"
            onClick={addOption}
            disabled={options.length >= MAX_PRODUCT_OPTIONS}
          >
            + ADD OPTION
          </button>
        </div>
        {options.length > 0 && (
          <ol className="a-parts-list">
            {options.map((option, index) => (
              // Keyed by position, like the parts above: a question has no
              // identity beyond where it sits in the list.
              <li key={index} className="a-option">
                <div className="a-parts-row">
                  <span className="a-parts-index">{index + 1}</span>
                  <input
                    className="a-input"
                    value={option.name}
                    maxLength={MAX_OPTION_NAME}
                    placeholder="What is being chosen — e.g. Inlay, Lid, Logo"
                    onChange={(e) => patchOption(index, { name: e.target.value })}
                  />
                  <button
                    className="a-btn a-btn-sm a-danger"
                    onClick={() => removeOption(index)}
                    aria-label={`Remove option ${index + 1}`}
                  >
                    ✕
                  </button>
                </div>
                <ul className="a-option-choices">
                  {option.choices.map((choice, choiceIndex) => (
                    <li key={choiceIndex} className="a-option-choice">
                      <input
                        className="a-input"
                        value={choice}
                        maxLength={MAX_CHOICE_NAME}
                        placeholder={choiceIndex === 0 ? 'The usual one' : 'Another to offer'}
                        aria-label={`${option.name || `Option ${index + 1}`} choice ${choiceIndex + 1}`}
                        onChange={(e) => setChoice(index, choiceIndex, e.target.value)}
                      />
                      <button
                        className="a-btn a-btn-sm a-danger"
                        onClick={() => removeChoice(index, choiceIndex)}
                        disabled={option.choices.length <= 2}
                        aria-label={`Remove choice ${choiceIndex + 1} from option ${index + 1}`}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  className="a-btn a-btn-sm"
                  onClick={() => addChoice(index)}
                  disabled={option.choices.length >= MAX_OPTION_CHOICES}
                >
                  + ADD CHOICE
                </button>
              </li>
            ))}
          </ol>
        )}
        <p className="a-location-note">
          {options.length > 0
            ? 'The storefront shows a dropdown per row, above the colours, and puts the answers on the order. The first choice is what a customer starts on, so put the usual build first — or lead with something like "Clarky picks" to have it come up in the chat. A row needs a name and at least two choices to be worth asking, so anything short of that is dropped when you save.'
            : 'For prints that come in versions — a different inlay, a different lid, with or without a logo. Add a row for what is being chosen, then list the choices on offer, and the storefront asks for it on the product page. Leave it empty for a print that is ordered exactly as pictured.'}
        </p>
      </div>

      <div className="a-parts a-ctext">
        <div className="a-parts-head">
          <span>Custom text</span>
          <label className="a-ctext-toggle">
            <input
              type="checkbox"
              checked={customText.enabled}
              onChange={(e) => setCustom({ enabled: e.target.checked })}
            />
            <span>Ask for text on this item</span>
          </label>
        </div>
        {customText.enabled && (
          <div className="a-ctext-fields">
            <label className="a-field a-ctext-label">
              <span>What to ask for</span>
              <input
                className="a-input"
                value={customText.label}
                maxLength={MAX_CUSTOM_TEXT_LABEL}
                placeholder={DEFAULT_CUSTOM_TEXT_LABEL}
                onChange={(e) => setCustom({ label: e.target.value })}
              />
            </label>
            <label className="a-field a-field-featured">
              <span>Required</span>
              <input
                type="checkbox"
                checked={customText.required}
                onChange={(e) => setCustom({ required: e.target.checked })}
              />
            </label>
          </div>
        )}
        <p className="a-location-note">
          {customText.enabled
            ? `The storefront shows a text box on this product and puts what is typed on the order, exactly as typed, however long it is. Name the question the way you would ask it — "Name to print", "Text to engrave" — because that is the wording a customer reads. Required stops the item going in the cart until there is something in the box, which is right for a print that cannot be made without the words.`
            : 'For prints that carry words a customer chooses — a name on a keyring, a date on a plaque. Switch it on and the storefront asks for the text on this product only.'}
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
