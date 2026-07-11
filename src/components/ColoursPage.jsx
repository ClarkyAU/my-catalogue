import React, { useEffect, useMemo, useState } from 'react';
import { swatchStyle, STATUS_ORDER } from '../lib/filamentSwatch.js';

// Maps each stock status to a CSS modifier for its badge/heading colour.
const STATUS_CLASS = {
  'In Stock': 'in-stock',
  'On Order': 'on-order',
  'Out of Stock': 'out-of-stock',
};

// Public filament colour library. Pulls the live list from the database and
// splits it into separate In Stock / On Order / Out of Stock sections. Each
// colour shows a finish-aware swatch, its material and finish, and — where the
// owner has uploaded them — a gallery of prints made in that colour. Customers
// can narrow the whole board by material type. The supplier name is never sent
// to or shown here.
export const ColoursPage = () => {
  const [filaments, setFilaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All');
  const [lightbox, setLightbox] = useState(null); // { prints, index } | null

  useEffect(() => {
    let cancelled = false;
    fetch('/api/filaments')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setFilaments(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setFilaments([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Distinct material types actually present in the library, for the Type filter.
  const types = useMemo(() => {
    const seen = [];
    for (const f of filaments) {
      const m = (f.material || '').trim();
      if (m && !seen.includes(m)) seen.push(m);
    }
    seen.sort((a, b) => a.localeCompare(b));
    return ['All', ...seen];
  }, [filaments]);

  const visible = useMemo(
    () =>
      filaments.filter(
        (f) => typeFilter === 'All' || (f.material || '').trim() === typeFilter,
      ),
    [filaments, typeFilter],
  );

  // Group the visible colours into their stock sections, preserving the
  // owner-defined order the API already sorted them into.
  const groups = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        status,
        items: visible.filter((f) => f.status === status),
      })).filter((g) => g.items.length > 0),
    [visible],
  );

  const openLightbox = (prints, index) => setLightbox({ prints, index });
  const closeLightbox = () => setLightbox(null);
  const step = (delta) =>
    setLightbox((lb) => {
      if (!lb) return lb;
      const n = lb.prints.length;
      return { ...lb, index: (lb.index + delta + n) % n };
    });

  return (
    <div className="landing-page colours-page">
      <h2 className="section-title">COLOUR LIBRARY</h2>

      {!loading && filaments.length > 0 && types.length > 1 && (
        <div className="filament-filters">
          <div className="filter-group">
            <span className="filter-label">TYPE</span>
            <div className="filter-pills">
              {types.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`filter-pill ${typeFilter === t ? 'active' : ''}`}
                  onClick={() => setTypeFilter(t)}
                >
                  {t === 'All' ? 'ALL' : t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="colours-message">LOADING COLOURS...</p>
      ) : filaments.length === 0 ? (
        <p className="colours-message">No colours listed yet — check back soon!</p>
      ) : groups.length === 0 ? (
        <p className="colours-message">No colours match those filters.</p>
      ) : (
        groups.map((group) => (
          <section className="filament-section" key={group.status}>
            <h3 className={`filament-section-title ${STATUS_CLASS[group.status]}`}>
              {group.status.toUpperCase()}
              <span className="filament-section-count">{group.items.length}</span>
            </h3>
            <ul className="filament-list-view">
              {group.items.map((f) => (
                <FilamentRow key={f.id} filament={f} onOpenPrint={openLightbox} />
              ))}
            </ul>
          </section>
        ))
      )}

      {lightbox && (
        <PrintLightbox
          prints={lightbox.prints}
          index={lightbox.index}
          onClose={closeLightbox}
          onStep={step}
        />
      )}
    </div>
  );
};

// A single colour: finish-aware swatch, name/material/finish, hex, status badge,
// and a strip of print thumbnails when the owner has uploaded examples.
function FilamentRow({ filament: f, onOpenPrint }) {
  const isOut = f.status === 'Out of Stock';
  const statusClass = STATUS_CLASS[f.status] || 'in-stock';
  const finish = f.finish && f.finish !== 'Standard' && f.finish !== 'Solid' ? f.finish : '';
  const subtitle = [f.material, finish].filter(Boolean).join(' · ');
  const prints = Array.isArray(f.prints) ? f.prints : [];

  return (
    <li className={`filament-row ${isOut ? 'is-out' : ''}`}>
      <div className="filament-row-top">
        <span
          className="filament-dot"
          style={swatchStyle(f)}
          title={f.hex}
          aria-hidden="true"
        />
        <span className="filament-row-main">
          <span className="filament-name">{f.name}</span>
          {subtitle && <span className="filament-material">{subtitle}</span>}
        </span>
        <span className="filament-row-meta">
          <span className="filament-hex">{f.hex}</span>
          <span className={`filament-status ${statusClass}`}>{f.status}</span>
        </span>
      </div>

      {prints.length > 0 && (
        <div className="filament-prints">
          <span className="filament-prints-label">EXAMPLES</span>
          <div className="filament-prints-strip">
            {prints.map((p, i) => (
              <button
                type="button"
                key={p.id}
                className="filament-print-thumb"
                onClick={() => onOpenPrint(prints, i)}
                title={p.caption || 'View print'}
              >
                <img src={p.url} alt={p.caption || `Print in ${f.name}`} loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}

// Full-screen viewer for a colour's print gallery, with prev/next when there is
// more than one image.
function PrintLightbox({ prints, index, onClose, onStep }) {
  const print = prints[index];
  const many = prints.length > 1;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && many) onStep(1);
      else if (e.key === 'ArrowLeft' && many) onStep(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onStep, many]);

  return (
    <div className="print-lightbox" onClick={onClose}>
      <div className="print-lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <button className="print-lightbox-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {many && (
          <button
            className="print-lightbox-nav prev"
            onClick={() => onStep(-1)}
            aria-label="Previous"
          >
            ‹
          </button>
        )}
        <img src={print.url} alt={print.caption || 'Print'} />
        {print.caption && <p className="print-lightbox-caption">{print.caption}</p>}
        {many && (
          <button
            className="print-lightbox-nav next"
            onClick={() => onStep(1)}
            aria-label="Next"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}
