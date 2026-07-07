import React from 'react';

export const DirectoryOverlay = ({ catalogue, isOpen, onClose, navigateTo }) => {
  if (!isOpen) return null;

  const go = (catId, subId, prodId) => {
    navigateTo(catId, subId, prodId);
    onClose();
  };

  return (
    <div className="catalogue-menu">
      <ul className="cat-list">
        {Object.values(catalogue).map(cat => (
          <li key={cat.id} className="cat-item">
            <div className="cat-row">
              <span className="cat-name">{cat.displayName}</span>
              <span className="cat-caret">›</span>
            </div>

            <div className="cat-flyout">
              {Object.values(cat.subCategories || {}).map(sub => (
                <div key={sub.id} className="sub-block">
                  <button
                    className="sub-link"
                    onClick={() => go(cat.id, sub.id, null)}
                  >
                    {sub.displayName}
                  </button>
                  <ul className="prod-list">
                    {Object.values(sub.products || {}).map(prod => (
                      <li key={prod.id}>
                        <button
                          className="prod-link"
                          onClick={() => go(cat.id, sub.id, prod.id)}
                        >
                          {prod.displayName}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
