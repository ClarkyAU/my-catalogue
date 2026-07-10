import React, { useEffect, useMemo, useState } from 'react';

// Maps each stock status to a CSS modifier for its badge colour.
const STATUS_CLASS = {
  'In Stock': 'in-stock',
  'On Order': 'on-order',
  'Out of Stock': 'out-of-stock',
};

const STATUS_FILTERS = ['All', 'In Stock', 'On Order', 'Out of Stock'];

// Public filament colour library. Pulls the live list from the database and
// renders a compact list — a colour dot, the name/material, and a stock badge.
// Customers can filter by material type and stock status. Out-of-stock colours
// stay visible but are dimmed so people know they exist. The supplier name is
// never sent to or shown here.
export const ColoursPage = () => {
  const [filaments, setFilaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

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
      filaments.filter((f) => {
        const typeOk = typeFilter === 'All' || (f.material || '').trim() === typeFilter;
        const statusOk = statusFilter === 'All' || f.status === statusFilter;
        return typeOk && statusOk;
      }),
    [filaments, typeFilter, statusFilter],
  );

  return (
    <div className="landing-page colours-page">
      <h2 className="section-title">COLOUR LIBRARY</h2>

      {!loading && filaments.length > 0 && (
        <div className="filament-filters">
          {types.length > 1 && (
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
          )}

          <div className="filter-group">
            <span className="filter-label">STOCK</span>
            <div className="filter-pills">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`filter-pill ${statusFilter === s ? 'active' : ''}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === 'All' ? 'ALL' : s.toUpperCase()}
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
      ) : visible.length === 0 ? (
        <p className="colours-message">No colours match those filters.</p>
      ) : (
        <ul className="filament-list-view">
          {visible.map((f) => {
            const isOut = f.status === 'Out of Stock';
            const statusClass = STATUS_CLASS[f.status] || 'in-stock';
            return (
              <li key={f.id} className={`filament-row ${isOut ? 'is-out' : ''}`}>
                <span
                  className="filament-dot"
                  style={{ backgroundColor: f.hex }}
                  title={f.hex}
                  aria-hidden="true"
                />
                <span className="filament-row-main">
                  <span className="filament-name">{f.name}</span>
                  {f.material && <span className="filament-material">{f.material}</span>}
                </span>
                <span className="filament-row-meta">
                  <span className="filament-hex">{f.hex}</span>
                  <span className={`filament-status ${statusClass}`}>{f.status}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
