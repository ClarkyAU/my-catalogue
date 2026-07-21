import { useState, useRef, useEffect } from 'react';

// Cascading catalogue menu that drops down, centered, from the catalogue button.
// It mirrors the real catalogue hierarchy: tier 1 lists the categories and tier 2
// reveals the sub-categories of a category. Each category row has two tap targets:
// the name navigates to the category, and the caret expands/collapses its
// sub-categories. Keeping expand on an explicit control (rather than hover) means
// it works the same with a mouse or a single tap on touch devices.
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
    document.addEventListener('touchstart', onDocClick);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
    };
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
              const hasSubs = subs.length > 0;
              return (
                <div
                  key={cat.id}
                  className={`cascade-cat ${isActive ? 'active' : ''}`}
                  onMouseEnter={() => {
                    // Desktop convenience: hovering previews the sub-categories.
                    // Guarded to real hover devices so a touch tap's synthetic
                    // mouseenter can't fight the caret toggle below (which would
                    // otherwise open then instantly close it — i.e. do nothing).
                    if (hasSubs && window.matchMedia('(hover: hover)').matches) {
                      setActiveCat(cat.id);
                    }
                  }}
                >
                  <div className="cascade-cat-row">
                    <button
                      className="cascade-cat-btn"
                      onClick={() => go(cat.id)}
                    >
                      <span>{cat.displayName.toUpperCase()}</span>
                    </button>
                    {hasSubs && (
                      <button
                        type="button"
                        className="cascade-caret"
                        onClick={() =>
                          setActiveCat((cur) => (cur === cat.id ? null : cat.id))
                        }
                        aria-expanded={isActive}
                        aria-label={`${isActive ? 'Collapse' : 'Expand'} ${cat.displayName} sub-categories`}
                      >
                        <span aria-hidden="true">{isActive ? '▾' : '▸'}</span>
                      </button>
                    )}
                  </div>

                  {isActive && hasSubs && (
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
