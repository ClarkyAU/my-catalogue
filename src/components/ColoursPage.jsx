import { useEffect, useMemo, useState } from 'react';
import { swatchStyle, STATUS_ORDER } from '../lib/filamentSwatch.js';
import { loadFilaments } from '../lib/filaments.js';
import { LIGHTBOX_IMAGE, imageUrl, responsiveImage, srcSetDensity } from '../lib/photos.js';
import { useFocusTrap } from '../hooks/useFocusTrap.js';
import { useOverlay } from '../hooks/useOverlay.js';
import { useSwipe } from '../hooks/useSwipe.js';
import { Breadcrumb } from './Breadcrumb';

// Print thumbs are 88px squares at every viewport, so a 1x/2x density srcset is
// correct for them. The lightbox opens at 90% of the viewport, which is not a
// fixed size at all, so it takes the fluid LIGHTBOX_IMAGE ladder instead.
const PRINT_THUMB_SIZE = { w: 88, h: 88 };

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
export const ColoursPage = ({ trail = [] }) => {
  const [filaments, setFilaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All');
  // { prints, index } while open. Backed by a history entry, so the back button
  // and the iOS back-swipe close the viewer instead of leaving the site.
  const lightbox = useOverlay('print-lightbox');

  useEffect(() => {
    let cancelled = false;
    loadFilaments().then((data) => {
      if (cancelled) return;
      setFilaments(data);
      setLoading(false);
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

  const openLightbox = (prints, index) => lightbox.open({ prints, index });
  // Moving between photos is not navigation, so it changes the value in place
  // rather than stacking a history entry per photo — otherwise leaving a gallery
  // of eight would take eight presses of back.
  const step = (delta) =>
    lightbox.update((lb) => {
      if (!lb) return lb;
      const n = lb.prints.length;
      return { ...lb, index: (lb.index + delta + n) % n };
    });

  return (
    <div className="landing-page colours-page">
      <h2 className="page-title">COLOUR LIBRARY</h2>
      <Breadcrumb trail={trail} />

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

      {lightbox.value && (
        <PrintLightbox
          prints={lightbox.value.prints}
          index={lightbox.value.index}
          onClose={lightbox.close}
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
                <img
                  src={imageUrl(p.url, PRINT_THUMB_SIZE)}
                  srcSet={srcSetDensity(p.url, PRINT_THUMB_SIZE)}
                  alt={p.caption || `Print in ${f.name}`}
                  loading="lazy"
                  decoding="async"
                />
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
  // The lightbox is sized in viewport units, so it takes the fluid ladder — and
  // it stops at the stored original's width rather than asking the CDN to
  // upscale past it the way the old fixed 1400/2800 pair did.
  const lightboxImage = responsiveImage(print.url, LIGHTBOX_IMAGE);
  // A real dialog: focus is held inside it while it is up and handed back to the
  // thumbnail that opened it on the way out.
  const dialogRef = useFocusTrap(true);
  // On a phone the arrows are pushed on top of the image (there is no room
  // beside it), so swiping is both the obvious gesture and the one that does not
  // cover the photo.
  const swipeRef = useSwipe({
    enabled: many,
    onNext: () => onStep(1),
    onPrevious: () => onStep(-1),
  });

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
      <div
        className="print-lightbox-inner"
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={print.caption ? `Print photo: ${print.caption}` : 'Print photo'}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="print-lightbox-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {many && (
          <button
            className="print-lightbox-nav prev"
            onClick={() => onStep(-1)}
            aria-label="Previous photo"
          >
            ‹
          </button>
        )}
        <img
          ref={swipeRef}
          src={lightboxImage.src}
          srcSet={lightboxImage.srcSet}
          sizes={lightboxImage.sizes}
          alt={print.caption || 'Print'}
        />
        {print.caption && <p className="print-lightbox-caption">{print.caption}</p>}
        {many && (
          <button
            className="print-lightbox-nav next"
            onClick={() => onStep(1)}
            aria-label="Next photo"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}
