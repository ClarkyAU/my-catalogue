import React, { useState, useEffect } from 'react';

export const ProductDisplay = ({ product }) => {
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  useEffect(() => setIndex(0), [product]);

  const currentPhoto = product.photos?.[index];

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: product.displayName,
      text: `Check out ${product.displayName} at Clarky3D`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Share sheet dismissed or clipboard unavailable — nothing to do.
    }
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
        {product.price && product.price !== "0.00" && (
          <div className="price-tag">${product.price}</div>
        )}
        <div className="description-box">{product.description}</div>
        <button className="share-btn" onClick={handleShare}>
          <i className="fa-solid fa-share-nodes"></i>
          {copied ? ' LINK COPIED' : ' SHARE'}
        </button>
      </div>
    </div>
  );
};