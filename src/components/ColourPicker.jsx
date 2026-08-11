import { useEffect, useId, useMemo, useRef, useState } from 'react';
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
 *
 * Presented as a select-only combobox: the trigger keeps keyboard focus the
 * whole time and points at the highlighted row through aria-activedescendant,
 * which is what lets arrow keys walk a list that is not in the tab order. The
 * rows are still buttons so a mouse and a touch screen behave exactly as before.
 */
function ColourSelect({ inStock, colour, note, onPick, onNote, label }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();
  const custom = Boolean(colour?.custom);

  // One flat list of everything that can be picked, so the keyboard only has to
  // deal with indices and the "which row is this" logic lives in one place.
  const choices = useMemo(
    () => [
      { key: 'any', name: ANY_COLOUR, swatch: null, pick: null },
      ...inStock.map((filament) => ({
        key: `filament-${filament.id}`,
        name: filament.name,
        traits: traitsOf(filament),
        swatch: filament,
        pick: filament,
      })),
      { key: 'custom', name: CUSTOM_OPTION, swatch: { custom: true }, extraClass: 'custom' },
    ],
    [inStock],
  );

  const selected = custom
    ? choices.length - 1
    : colour
      ? Math.max(
          0,
          choices.findIndex((choice) => choice.swatch?.id === colour.id),
        )
      : 0;

  // Which row the arrow keys are on. Separate from `selected`, which is what has
  // actually been chosen — moving through the list must not change the item.
  const [active, setActive] = useState(selected);

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

  // The list scrolls once the library is longer than the panel, so the row the
  // arrow keys are on has to be brought into view — focus is on the trigger, so
  // the browser will not do it.
  useEffect(() => {
    if (!open) return;
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const choose = (picked) => {
    onPick(picked);
    setOpen(false);
  };

  const chooseIndex = (index) => {
    const choice = choices[index];
    // The custom row carries whatever was typed before, so switching back to it
    // does not wipe the request.
    choose(choice.key === 'custom' ? { custom: true, note } : choice.pick);
  };

  const openAt = (index) => {
    setActive(index);
    setOpen(true);
  };

  const onTriggerKeyDown = (event) => {
    const last = choices.length - 1;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) openAt(selected);
        else setActive((i) => Math.min(last, i + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) openAt(selected);
        else setActive((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        if (!open) break;
        event.preventDefault();
        setActive(0);
        break;
      case 'End':
        if (!open) break;
        event.preventDefault();
        setActive(last);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!open) openAt(selected);
        else chooseIndex(active);
        break;
      case 'Escape':
        if (open) {
          event.preventDefault();
          setOpen(false);
        }
        break;
      case 'Tab':
        // Leaving the control leaves the list behind; the browser handles the
        // move itself.
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className="colour-select-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`colour-select ${open ? 'open' : ''}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-expanded={open}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-label={label ? `${label} colour` : 'Print colour'}
        onClick={() => (open ? setOpen(false) : openAt(selected))}
        onKeyDown={onTriggerKeyDown}
      >
        <ColourSwatch colour={colour} />
        <span className="colour-select-label">{colourLabel(colour) || ANY_COLOUR}</span>
        <span className="colour-select-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <ul
          className="colour-options"
          id={listId}
          ref={listRef}
          role="listbox"
          aria-label={label ? `${label} colour` : 'Print colour'}
        >
          {choices.map((choice, i) => (
            // The list items are scaffolding; the buttons inside them are the
            // options as far as assistive technology is concerned.
            <li key={choice.key} role="presentation">
              <button
                type="button"
                id={`${listId}-${i}`}
                role="option"
                // Out of the tab order on purpose: the trigger is the one stop
                // for this control, and it drives the list from there.
                tabIndex={-1}
                aria-selected={i === selected}
                className={`colour-option ${choice.extraClass || ''} ${i === selected ? 'active' : ''} ${i === active ? 'here' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => chooseIndex(i)}
              >
                <ColourSwatch colour={choice.swatch} />
                <span className="colour-option-name">{choice.name}</span>
                {choice.traits && <span className="colour-option-traits">{choice.traits}</span>}
              </button>
            </li>
          ))}
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
      <div className="panel colour-picker">
        <div className="panel-head">
          <span className="panel-label">PRINT COLOUR</span>
        </div>
        <ColourSelect {...slotProps(0)} />
      </div>
    );
  }

  const chosen = value.filter((slot) => slot.colour).length;

  return (
    <div className="panel colour-picker">
      <div className="panel-head">
        <span className="panel-label">PRINT COLOURS</span>
        <span className="panel-value">
          {chosen} of {parts.length} set
        </span>
      </div>

      <ul className="colour-parts">
        {parts.map((part, index) => (
          <li key={part} className="colour-part">
            <span className="colour-part-name">{part}</span>
            <ColourSelect {...slotProps(index)} label={part} />
          </li>
        ))}
      </ul>

      <p className="colour-parts-note">
        This one is printed in pieces, so each can be its own colour. Leave any of them on Lucky Dip
        and Clarky will pick.
      </p>
    </div>
  );
};
