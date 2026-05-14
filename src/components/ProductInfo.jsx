import React, { useState } from 'react';

export const ProductInfo = ({ title, description }) => {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="details-pane">
      <h2 className="product-title">{title}</h2>
      <div className="description-box">{description}</div>
      <div style={{ textAlign: 'right', marginTop: '20px' }}>
        <button onClick={handleShare} className="share-btn">
          {copied ? "[ COPIED! ]" : "[ SHARE ]"}
        </button>
      </div>
    </div>
  );
};