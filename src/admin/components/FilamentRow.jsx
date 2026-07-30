import { useState } from 'react';
import { api } from '../api.js';
import { swatchStyle, FILAMENT_FINISHES } from '../../lib/filamentSwatch.js';
import { useFilamentStore } from '../useFilaments.js';
import { FILAMENT_STATUSES, normFinish } from '../filamentFields.js';
import { FinishColors } from './FinishControls.jsx';
import { FilamentPrints } from './FilamentPrints.jsx';

// One colour in the library: its name, material, finish, colour(s), stock status
// and the example prints shown beneath it on the public page.
export function FilamentRow({ filament, isFirst, isLast }) {
  const { reload, patchFilament } = useFilamentStore();
  const [name, setName] = useState(filament.name);
  const [material, setMaterial] = useState(filament.material || '');
  const [finish, setFinish] = useState(normFinish(filament.finish));
  const [hex, setHex] = useState(filament.hex || '#000000');
  const [hex2, setHex2] = useState(filament.hex2 || '#ff00aa');
  const [colors, setColors] = useState(
    Array.isArray(filament.colors) && filament.colors.length >= 2
      ? filament.colors
      : [filament.hex || '#00e5ff', '#ff00aa'],
  );
  const [status, setStatus] = useState(filament.status || 'In Stock');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [moving, setMoving] = useState(false);

  const savedColors = JSON.stringify(filament.colors || []);
  const dirty =
    name !== filament.name ||
    material !== (filament.material || '') ||
    finish !== normFinish(filament.finish) ||
    hex !== filament.hex ||
    (finish === 'Marble' && hex2 !== (filament.hex2 || '#ff00aa')) ||
    (finish === 'Gradient' && JSON.stringify(colors) !== savedColors) ||
    status !== filament.status;

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const row = await api(`/filaments/${filament.id}`, {
        method: 'PATCH',
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
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      patchFilament(row);
    } finally {
      setSaving(false);
    }
  };

  // Reordering and deleting both change the list itself, so they refetch.
  const move = async (direction) => {
    setMoving(true);
    try {
      await api(`/filaments/${filament.id}/reorder`, { method: 'POST', body: { direction } });
      await reload();
    } finally {
      setMoving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete filament "${filament.name}"?`)) return;
    await api(`/filaments/${filament.id}`, { method: 'DELETE' });
    reload();
  };

  const preview = {
    finish,
    hex,
    hex2: finish === 'Marble' ? hex2 : null,
    colors: finish === 'Gradient' ? colors : null,
  };

  return (
    <div className="a-fil-item">
      <div className="a-fil-row">
        <div className="a-fil-reorder">
          <button className="a-mini" onClick={() => move('up')} disabled={isFirst || moving} title="Move up">▲</button>
          <button className="a-mini" onClick={() => move('down')} disabled={isLast || moving} title="Move down">▼</button>
        </div>
        <span className="a-fil-swatch" style={swatchStyle(preview)} />
        <input className="a-input a-fil-name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="a-input a-fil-mat" value={material} placeholder="Material"
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
        <select className="a-input a-fil-status" value={status} onChange={(e) => setStatus(e.target.value)}>
          {FILAMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="a-btn a-btn-sm" onClick={save} disabled={!dirty || saving}>
          {saving ? '…' : saved ? '✓' : 'SAVE'}
        </button>
        <button className="a-btn a-btn-sm a-danger" onClick={remove}>DEL</button>
      </div>
      <FilamentPrints filament={filament} />
    </div>
  );
}
