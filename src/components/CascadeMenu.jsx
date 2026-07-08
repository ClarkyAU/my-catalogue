import React, { useState, useRef, useEffect } from 'react';

// Cascading catalogue menu that drops down, centered, from the catalogue button.
// Tier 1 lists the categories; hovering (or tapping) a category flies its
// products out to the right in tier 2. Selecting a product navigates to it.
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

  // Flatten every product in a category (across its sub-categories) into a
  // single list for the tier-2 flyout, keeping the sub-category id so we can
  // build the correct navigation hash.
  const productsFor = (cat) => {
    const list = [];
    Object.values(cat.subCategories || {}).forEach((sub) => {
      Object.values(sub.products || {}).forEach((prod) => {
        list.push({ ...prod, subId: sub.id });
      });
    });
    return list;
  };

  const go = (catId, subId, prodId) => {
    navigateTo(catId, subId, prodId);
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
              return (
                <div
                  key={cat.id}
                  className={`cascade-cat ${isActive ? 'active' : ''}`}
                  onMouseEnter={() => setActiveCat(cat.id)}
                >
                  <button
                    className="cascade-cat-btn"
                    onClick={() => go(cat.id)}
                    aria-expanded={isActive}
                  >
                    <span>{cat.displayName.toUpperCase()}</span>
                    <span className="cascade-arrow">▸</span>
                  </button>

                  {isActive && (
                    <div className="cascade-tier cascade-tier-2">
                      {productsFor(cat).map((prod) => (
                        <button
                          key={`${prod.subId}/${prod.id}`}
                          className="cascade-prod-btn"
                          onClick={() => go(cat.id, prod.subId, prod.id)}
                        >
                          {prod.displayName}
                        </button>
                      ))}
                      {productsFor(cat).length === 0 && (
                        <div className="cascade-empty">NO PRODUCTS</div>
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
