import { MAX_GRADIENT_COLORS } from '../../lib/filamentSwatch.js';
import { DEFAULT_GRADIENT } from '../filamentFields.js';

// The count control + per-colour pickers shown for the Gradient finish. The
// colours blend left-to-right in the order shown.
function GradientEditor({ colors, onChange }) {
  const list = Array.isArray(colors) && colors.length >= 2 ? colors : DEFAULT_GRADIENT;
  const setAt = (i, v) => onChange(list.map((c, idx) => (idx === i ? v : c)));
  const addColor = () => {
    if (list.length < MAX_GRADIENT_COLORS) onChange([...list, '#ffffff']);
  };
  const removeColor = () => {
    if (list.length > 2) onChange(list.slice(0, -1));
  };
  return (
    <div className="a-grad">
      <div className="a-grad-count">
        <button type="button" className="a-mini" onClick={removeColor} disabled={list.length <= 2}>−</button>
        <span>{list.length} colours</span>
        <button type="button" className="a-mini" onClick={addColor} disabled={list.length >= MAX_GRADIENT_COLORS}>+</button>
      </div>
      <div className="a-grad-swatches">
        {list.map((c, i) => (
          <input
            key={i}
            className="a-color"
            type="color"
            value={c}
            onChange={(e) => setAt(i, e.target.value)}
            title={`Colour ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// The finish-specific colour controls, shared by the add form and each row:
// a primary picker plus either a speckle picker (Marble) or the gradient
// editor (Gradient).
export function FinishColors({ finish, hex, setHex, hex2, setHex2, colors, setColors }) {
  return (
    <>
      <input className="a-color" type="color" value={hex}
        onChange={(e) => setHex(e.target.value)} title="Primary colour" />
      {finish === 'Marble' && (
        <input className="a-color" type="color" value={hex2}
          onChange={(e) => setHex2(e.target.value)} title="Speckle colour" />
      )}
      {finish === 'Gradient' && <GradientEditor colors={colors} onChange={setColors} />}
    </>
  );
}
