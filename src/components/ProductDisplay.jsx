import React, { useState, useEffect } from 'react';

export const ProductDisplay = ({ product }) => {
  const [index, setIndex] = useState(0);
  const [shared, setShared] = useState(false);
  useEffect(() => { setIndex(0); setShared(false); }, [product]);

  const currentPhoto = product.photos?.[index];
  const hasPrice = product.price && product.price !== "0.00";

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = { title: `${product.displayName} — Clarky's Printhouse`, url };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div className="product-card">
      <div className="gallery-pane">
        <div className="main-image-container">
          {product.photos?.length > 0 ? (
            <div className="image-wrapper">
              <img src={currentPhoto?.url || currentPhoto} className="main-img" alt="" />
              
              {(currentPhoto?.filaments || currentPhoto?.texture) && (
                <div className="image-caption">
                  {currentPhoto.filaments && (
                    <span className="caption-line">
                      <span className="caption-label">Printed with - </span>
                      <span className="filament-list">
                        {currentPhoto.filaments.join(', ').toUpperCase()}
                      </span>
                    </span>
                  )}
                  {currentPhoto.texture && (
                    <span className="caption-line">
                      <span className="caption-label">Surface Texture - </span>
                      <span className="texture-tag">
                        {currentPhoto.texture.toUpperCase()}
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="placeholder" style={{ fontFamily: 'Space Mono', color: '#888', textAlign: 'center', paddingTop: '40%' }}>
              PICTURE TO COME
            </div>
          )}
        </div>
        
        <div className="thumb-container">
          {product.photos?.map((img, i) => (
            <img 
              key={i} 
              src={img.url || img} 
              onClick={() => setIndex(i)} 
              className={`thumb ${index === i ? 'active' : ''}`} 
              alt="" 
            />
          ))}
        </div>
      </div>
      
      <div className="details-pane">
        <h2 className="product-title">{product.displayName}</h2>

        <div className="product-meta">
          {hasPrice && <span className="price-tag">${product.price}</span>}
          <button className="share-btn" onClick={handleShare} title="Share this product">
            <i className="fa-solid fa-share-nodes"></i>
            {shared ? 'LINK COPIED' : 'SHARE'}
          </button>
        </div>

        <div className="description-box">{product.description}</div>
      </div>
    </div>
  );
};