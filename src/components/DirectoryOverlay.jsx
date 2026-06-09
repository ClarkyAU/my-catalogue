import React from 'react';

export const DirectoryOverlay = ({ catalogue, isOpen, onClose, navigateTo }) => {
  if (!isOpen) return null;

  return (
    <div className="dos-overlay">
      <div className="dos-header">
        <span className="dos-title">C:\&gt; DIR CATALOGUE</span>
        <button className="dos-close" onClick={onClose}>[X] CLOSE</button>
      </div>
      <div className="dos-content">
        {Object.values(catalogue).map(cat => (
          <div key={cat.id} className="dos-tree-section">
            <div className="dos-dir">&lt;DIR&gt; {cat.displayName.toUpperCase()}</div>
            {Object.values(cat.subCategories || {}).map(sub => (
              <button
                key={sub.id}
                className="dos-item"
                onClick={() => {
                  navigateTo(cat.id, sub.id, null);
                  onClose();
                }}
              >
                |-- {sub.displayName.toUpperCase()}
              </button>
            ))}
          </div>
        ))}
        <div className="dos-cursor">_</div>
      </div>
    </div>
  );
};