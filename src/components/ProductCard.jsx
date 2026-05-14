import React, { useState } from 'react';

export const ProductCard = ({ product }) => {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="product-card">
      <div className="gallery-pane">
        <div className="main-image-container">
          {product.photos?.length > 0 ? (
            <img src={product.photos[photoIndex]} alt="" className="main-img" />
          ) : (
            <div className="placeholder-text">PICTURE TO COME</div>
          )}
        </div>
        <div className="thumbnail-row">
          {product.photos?.map((img, idx) => (
            <img key={idx} src={img} onClick={() => setPhotoIndex(idx)} 
                 className={`thumb ${photoIndex === idx ? 'active' : ''}`} alt="" />
          ))}
        </div>
      </div>

      <div className="details-pane">
        <h2 className="product-title">{product.displayName}</h2>
        <div className="description-box">{product.description}</div>
        <div className="action-row">
          <button onClick={handleShare} className="share-btn">
            {copied ? "[ COPIED! ]" : "[ SHARE ]"}
          </button>
        </div>
      </div>
    </main>
  );
};