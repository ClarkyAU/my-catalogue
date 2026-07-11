import React, { useState, useRef, useEffect } from 'react';

// Cascading catalogue menu that drops down, centered, from the catalogue button.
// It mirrors the real catalogue hierarchy: tier 1 lists the categories and tier 2
// flies out the sub-categories of the hovered category. Selecting either level
// navigates to it.
export const CascadeMenu = ({ catalogue, navigateTo }) => {
  const [open, setOpen] = useState(false);
  const [activeCat, setActiveCat] = useState(null);
  const wrapRef = useRef(null);

  // Close the menu when clicking anywhere outside it.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setActiveCat(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const categories = Object.values(catalogue || {});

  const subCategoriesFor = (cat) => Object.values(cat.subCategories || {});

  const go = (catId, subId) => {
    navigateTo(catId, subId);
    setOpen(false);
    setActiveCat(null);
  };

  return (
    <div className="cascade-wrap" ref={wrapRef}>
      <button
        className={`nav-btn hub-btn ${open ? 'active' : ''}`}
        onClick={() => {
          setOpen((o) => !o);
          setActiveCat(null);
        }}
        aria-expanded={open}
      >
        [ MY CATALOGUE ]
      </button>

      {open && (
        <div className="cascade-menu">
          <div className="cascade-tier cascade-tier-1">
            <div className="cascade-head">SELECT CATEGORY</div>
            {categories.length === 0 && (
              <div className="cascade-empty">LOADING...</div>
            )}
            {categories.map((cat) => {
              const isActive = activeCat === cat.id;
              const subs = subCategoriesFor(cat);
              return (
                <div
                  key={cat.id}
                  className={`cascade-cat ${isActive ? 'active' : ''}`}
                  onMouseEnter={() => {
                    setActiveCat(cat.id);
                  }}
                >
                  <button
                    className="cascade-cat-btn"
                    onClick={() => go(cat.id)}
                    aria-expanded={isActive}
                  >
                    <span>{cat.displayName.toUpperCase()}</span>
                  </button>

                  {isActive && (
                    <div className="cascade-tier cascade-tier-2">
                      {subs.map((sub) => (
                        <button
                          key={sub.id}
                          className="cascade-cat-btn"
                          onClick={() => go(cat.id, sub.id)}
                        >
                          <span>{sub.displayName}</span>
                        </button>
                      ))}
                      {subs.length === 0 && (
                        <div className="cascade-empty">NO SUB-CATEGORIES</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
