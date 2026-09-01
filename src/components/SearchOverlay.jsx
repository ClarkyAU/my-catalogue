import { useEffect, useMemo, useRef, useState } from 'react';
import { SearchIcon } from './Icons';
import { flattenCatalogue, searchCatalogue } from '../lib/search.js';
import { imageUrl, srcSetDensity } from '../lib/photos.js';
import { useFocusTrap } from '../hooks/useFocusTrap.js';

// The result thumbs are 56px squares at every width, which is the one case where
// a 1x/2x density srcset is the right answer.
const THUMB_SIZE = { w: 56, h: 56 };

/**
 * Search over the whole catalogue, as an overlay rather than a page.
 *
 * One dialog serves both ends of the range instead of a persistent field on
 * desktop and something else on a phone: the header only has to find room for a
 * single icon (it is already two rows on a narrow screen), and the panel itself
 * is the same on every device. Desktop gets the keyboard route in — "/" or
 * Cmd/Ctrl-K to open, arrows and Enter to pick — and a phone gets a full-width
 * field with the keyboard already up.
 */
export const SearchOverlay = ({ catalogue, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const panelRef = useFocusTrap(true);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Built once per catalogue rather than per keystroke.
  const entries = useMemo(() => flattenCatalogue(catalogue), [catalogue]);
  const results = useMemo(() => searchCatalogue(entries, query), [entries, query]);

  // Mounted only while open (see App.jsx), so the field starts empty every time
  // and there is no stale query to clear on the way out.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep the highlighted row in view when the arrows walk past the fold.
  useEffect(() => {
    const row = listRef.current?.children?.[active];
    row?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = (path) => {
    onNavigate();
    window.location.hash = path;
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(results[active].path);
    }
  };

  const total = entries.length;

  return (
    <div className="search-overlay" onClick={onClose}>
      <div
        className="search-panel"
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Search the catalogue"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="search-field">
          <span className="search-field-icon" aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            type="search"
            className="search-input"
            value={query}
            placeholder="Search prints…"
            aria-label="Search the catalogue"
            autoComplete="off"
            // The results are a listbox this field drives, and they change as
            // it is typed in, so a screen reader is told where they are and how
            // many there are rather than being left to find them.
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="search-results"
            aria-activedescendant={results.length ? `search-result-${active}` : undefined}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
          />
          <button type="button" className="search-close" onClick={onClose} aria-label="Close search">
            ✕
          </button>
        </div>

        <p className="search-status" aria-live="polite">
          {query.trim() === ''
            ? `${total} print${total === 1 ? '' : 's'} in the catalogue`
            : `${results.length} match${results.length === 1 ? '' : 'es'}`}
        </p>

        {query.trim() !== '' && results.length === 0 ? (
          <div className="search-empty">
            <p>Nothing matched “{query.trim()}”.</p>
            <p className="search-empty-hint">
              Try a shorter word, or browse the catalogue from the bar above — if it is something
              Clarky has not listed, the order button will still reach him.
            </p>
          </div>
        ) : (
          <ul className="search-results" id="search-results" role="listbox" ref={listRef}>
            {results.map((entry, i) => (
              <li key={entry.path}>
                <a
                  id={`search-result-${i}`}
                  className={`search-result ${i === active ? 'here' : ''}`}
                  href={`#${entry.path}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  // Not preventDefault'd: the browser follows the href, which
                  // keeps modifier-clicking a result into a new tab working.
                  onClick={onNavigate}
                >
                  <span className="search-result-thumb">
                    {entry.photo ? (
                      <img
                        src={imageUrl(entry.photo, THUMB_SIZE)}
                        srcSet={srcSetDensity(entry.photo, THUMB_SIZE)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        width="56"
                        height="56"
                      />
                    ) : (
                      <span className="search-result-thumb-ph" aria-hidden="true">▢</span>
                    )}
                  </span>
                  <span className="search-result-main">
                    <span className="search-result-name">{entry.name}</span>
                    <span className="search-result-where">
                      {entry.categoryName} / {entry.subCategoryName}
                    </span>
                  </span>
                  {entry.price && entry.price !== '0.00' && (
                    <span className="search-result-price">${entry.price}</span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
