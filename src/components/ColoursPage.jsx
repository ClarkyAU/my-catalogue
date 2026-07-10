import React, { useEffect, useState } from 'react';

// Maps each stock status to a CSS modifier for its badge colour.
const STATUS_CLASS = {
  'In Stock': 'in-stock',
  'On Order': 'on-order',
  'Out of Stock': 'out-of-stock',
};

// Public filament colour library. Pulls the live list from the database and
// renders a swatch grid. Out-of-stock colours stay visible but are dimmed so
// customers know they exist. The supplier name is never sent to or shown here.
export const ColoursPage = () => {
  const [filaments, setFilaments] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="landing-page colours-page">
      <h2 className="section-title">COLOUR LIBRARY</h2>

      {loading ? (
        <p className="colours-message">LOADING COLOURS...</p>
      ) : filaments.length === 0 ? (
        <p className="colours-message">No colours listed yet — check back soon!</p>
      ) : (
        <div className="filament-grid">
          {filaments.map((f) => {
            const isOut = f.status === 'Out of Stock';
            const statusClass = STATUS_CLASS[f.status] || 'in-stock';
            return (
              <div key={f.id} className={`filament-card ${isOut ? 'is-out' : ''}`}>
                <div className="filament-swatch" style={{ backgroundColor: f.hex }}>
                  {isOut && <span className="filament-out-badge">OUT</span>}
                </div>
                <div className="filament-info">
                  <h3 className="filament-name">{f.name}</h3>
                  {f.material && <span className="filament-material">{f.material}</span>}
                  <span className={`filament-status ${statusClass}`}>{f.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
