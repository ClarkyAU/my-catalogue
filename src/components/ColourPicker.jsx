import { useEffect, useRef, useState } from 'react';
import { swatchStyle } from '../lib/filamentSwatch.js';
import { colourLabel, MAX_COLOUR_NOTE } from '../lib/cart.js';

// Choosing colours. A wall of unlabelled swatches reads as a guessing game —
// "Blue Marble" and "Galaxy Blue" look much the same at 38px — so the choice is
// a dropdown that names every colour and shows its swatch beside the name. That
// also keeps a print assembled from five separately-coloured pieces down to five
// compact rows instead of five strips of swatches.

export const ANY_COLOUR = 'Any / Lucky Dip';
const CUSTOM_OPTION = 'Something not listed…';

/** The swatch for a choice, whatever kind of choice it is. */
export const ColourSwatch = ({ colour, className = '' }) => {
  if (colour?.custom) return <span className={`colour-swatch custom ${className}`}>?</span>;
  if (colour) return <span className={`colour-swatch ${className}`} style={swatchStyle(colour)} />;
  return <span className={`colour-swatch any ${className}`} />;
};

/** The material and finish of a filament, as the small print under its name. */
const traitsOf = (filament) =>
  [filament.material, filament.finish === 'Standard' ? null : filament.finish]
    .map((trait) => (trait || '').trim())
    .filter(Boolean)
    .join(' · ');

/**
 * The colours on the shelf by name, plus leaving it open and plus asking for one
 * we don't stock. `note` is held by the caller so a typed request survives
 * picking something else and changing your mind.
 */
function ColourSelect({ inStock, colour, note, onPick, onNote, label }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const custom = Boolean(colour?.custom);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    // Tapping anywhere else is a way out of the list without choosing.
    const onDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  const choose = (picked) => {
    onPick(picked);
    setOpen(false);
  };

  return (
    <div className="colour-select-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`colour-select ${open ? 'open' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={label ? `${label} colour` : 'Print colour'}
        onClick={() => setOpen(!open)}
      >
        <ColourSwatch colour={colour} />
        <span className="colour-select-label">{colourLabel(colour) || ANY_COLOUR}</span>
        <span className="colour-select-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <ul className="colour-options">
          <li>
            <button
              type="button"
              className={`colour-option ${!colour ? 'active' : ''}`}
              aria-pressed={!colour}
              onClick={() => choose(null)}
            >
              <ColourSwatch colour={null} />
              <span className="colour-option-name">{ANY_COLOUR}</span>
            </button>
          </li>

          {inStock.map((filament) => {
            const traits = traitsOf(filament);
            const active = colour?.id === filament.id;
            return (
              <li key={filament.id}>
                <button
                  type="button"
                  className={`colour-option ${active ? 'active' : ''}`}
                  aria-pressed={active}
                  onClick={() => choose(filament)}
                >
                  <ColourSwatch colour={filament} />
                  <span className="colour-option-name">{filament.name}</span>
                  {traits && <span className="colour-option-traits">{traits}</span>}
                </button>
              </li>
            );
          })}

          <li>
            <button
              type="button"
              className={`colour-option custom ${custom ? 'active' : ''}`}
              aria-pressed={custom}
              onClick={() => choose({ custom: true, note })}
            >
              <ColourSwatch colour={{ custom: true }} />
              <span className="colour-option-name">{CUSTOM_OPTION}</span>
            </button>
          </li>
        </ul>
      )}

      {custom && (
        <label className="colour-custom">
          <span className="colour-custom-label">
            WHAT COLOUR ARE YOU AFTER? — Clarky will confirm what he can source.
          </span>
          <input
            type="text"
            className="colour-custom-input"
            value={note}
            maxLength={MAX_COLOUR_NOTE}
            placeholder="e.g. matte forest green, or something close to my logo"
            autoFocus
            onChange={(event) => onNote(event.target.value)}
          />
        </label>
      )}
    </div>
  );
}

/**
 * `parts` is the list of pieces this print colours separately, empty for the
 * usual single-colour print. `value` is one entry per slot; `onChange` is given
 * the whole updated list, which is the shape the cart stores.
 */
export const ColourPicker = ({ parts, inStock, value, onChange }) => {
  // Free-text requests, kept per slot so switching a part to a stocked colour
  // and back doesn't lose what was typed.
  const [notes, setNotes] = useState({});

  const setSlot = (index, colour) =>
    onChange(value.map((slot, i) => (i === index ? { ...slot, colour } : slot)));

  const slotProps = (index) => ({
    inStock,
    colour: value[index]?.colour || null,
    note: notes[index] || '',
    onPick: (colour) => setSlot(index, colour),
    onNote: (note) => {
      setNotes((current) => ({ ...current, [index]: note }));
      setSlot(index, { custom: true, note });
    },
  });

  if (parts.length === 0) {
    return (
      <div className="colour-picker">
        <div className="colour-picker-head">
          <span className="colour-picker-label">PRINT COLOUR</span>
        </div>
        <ColourSelect {...slotProps(0)} />
      </div>
    );
  }

  const chosen = value.filter((slot) => slot.colour).length;

  return (
    <div className="colour-picker parts">
      <div className="colour-picker-head">
        <span className="colour-picker-label">PRINT COLOURS</span>
        <span className="colour-picker-value">
          {chosen} OF {parts.length} CHOSEN
        </span>
      </div>
      <p className="colour-parts-note">
        This one is printed in pieces, so each can be its own colour. Leave any of them on Lucky Dip
        and Clarky will pick.
      </p>

      <ul className="colour-parts">
        {parts.map((part, index) => (
          <li key={part} className="colour-part">
            <span className="colour-part-name">{part}</span>
            <ColourSelect {...slotProps(index)} label={part} />
          </li>
        ))}
      </ul>
    </div>
  );
};
