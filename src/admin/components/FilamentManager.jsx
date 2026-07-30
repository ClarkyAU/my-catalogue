import { useState } from 'react';
import { api } from '../api.js';
import { swatchStyle, FILAMENT_FINISHES, STATUS_ORDER } from '../../lib/filamentSwatch.js';
import { useFilaments, FilamentStoreProvider } from '../useFilaments.js';
import { FILAMENT_STATUSES, DEFAULT_GRADIENT } from '../filamentFields.js';
import { FinishColors } from './FinishControls.jsx';
import { FilamentRow } from './FilamentRow.jsx';

// The filament library: every colour on the public Colours page, grouped by
// stock status, plus the form for adding a new one.
export function FilamentManager() {
  const store = useFilaments();
  const { items, loading, error, setError, reload } = store;

  // New-filament form state.
  const [name, setName] = useState('');
  const [material, setMaterial] = useState('');
  const [finish, setFinish] = useState('Standard');
  const [hex, setHex] = useState('#00e5ff');
  const [hex2, setHex2] = useState('#ff00aa');
  const [colors, setColors] = useState(DEFAULT_GRADIENT);
  const [status, setStatus] = useState('In Stock');
  const [adding, setAdding] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setError('');
    try {
      await api('/filaments', {
        method: 'POST',
        body: {
          name: name.trim(),
          material: material.trim(),
          finish,
          hex,
          hex2: finish === 'Marble' ? hex2 : null,
          colors: finish === 'Gradient' ? colors : null,
          status,
        },
      });
      setName('');
      setMaterial('');
      setFinish('Standard');
      setHex('#00e5ff');
      setHex2('#ff00aa');
      setColors(DEFAULT_GRADIENT);
      setStatus('In Stock');
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  // Split into the same stock groups the public page shows, preserving the
  // API's sort order within each group.
  const groups = STATUS_ORDER.map((s) => ({
    status: s,
    items: items.filter((f) => f.status === s),
  }));

  // Live preview swatch for the add form.
  const previewFilament = {
    finish,
    hex,
    hex2: finish === 'Marble' ? hex2 : null,
    colors: finish === 'Gradient' ? colors : null,
  };

  return (
    <FilamentStoreProvider value={store}>
      <section className="a-settings">
        <h2 className="a-settings-title">FILAMENT COLOURS</h2>
        <p className="a-settings-hint">
          Colours shown on the public Colours page, grouped by stock status. Use the arrows to reorder
          within a group. Add examples to show what has been printed in each colour. Supplier details are
          never stored or shown on the site.
        </p>

        <form className="a-fil-add" onSubmit={add}>
          <span className="a-fil-swatch" style={swatchStyle(previewFilament)} />
          <input className="a-input" placeholder="Colour name" value={name}
            onChange={(e) => setName(e.target.value)} />
          <input className="a-input" placeholder="Material (e.g. PLA)" value={material}
            onChange={(e) => setMaterial(e.target.value)} />
          <select className="a-input a-fil-finish" value={finish} onChange={(e) => setFinish(e.target.value)}>
            {FILAMENT_FINISHES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <FinishColors
            finish={finish}
            hex={hex} setHex={setHex}
            hex2={hex2} setHex2={setHex2}
            colors={colors} setColors={setColors}
          />
          <select className="a-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {FILAMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="a-btn a-btn-sm" type="submit" disabled={adding || !name.trim()}>
            {adding ? 'ADDING…' : '+ ADD'}
          </button>
        </form>

        {error && <p className="a-error">{error}</p>}

        {loading ? (
          <p className="a-muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="a-muted">No filaments yet. Add one above.</p>
        ) : (
          groups.map((group) => (
            <div className="a-fil-group" key={group.status}>
              <h3 className="a-fil-group-title">
                {group.status} <span>{group.items.length}</span>
              </h3>
              {group.items.length === 0 ? (
                <p className="a-muted a-fil-empty">None.</p>
              ) : (
                <div className="a-fil-list">
                  {group.items.map((filament, i) => (
                    <FilamentRow
                      key={filament.id}
                      filament={filament}
                      isFirst={i === 0}
                      isLast={i === group.items.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </section>
    </FilamentStoreProvider>
  );
}
