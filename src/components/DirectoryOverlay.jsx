import React from 'react';

export const DirectoryOverlay = ({ catalogue, isOpen, onClose, navigateTo }) => {
  if (!isOpen) return null;

  return (
    <div className="dos-overlay">
      <div className="dos-titlebar">
        <span className="dos-prompt">
          C:\CATALOGUE&gt;<span className="dos-blink">_</span>
        </span>
        <button className="dos-close" onClick={onClose}>[ X ]</button>
      </div>
      <div className="dos-content">
        {Object.values(catalogue).map(cat => (
          <div key={cat.id} className="dos-tree-section">
            <div className="dos-dir">{cat.displayName.toUpperCase()}</div>
            <div className="dos-items">
              {Object.values(cat.subCategories || {}).map(sub => (
                <button
                  key={sub.id}
                  className="dos-item"
                  onClick={() => {
                    navigateTo(cat.id, sub.id, null);
                    onClose();
                  }}
                >
                  <span className="dos-item-marker">&#9656;</span>
                  {sub.displayName.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
