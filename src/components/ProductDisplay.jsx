import { useState, useEffect } from 'react';

export const ProductDisplay = ({ product }) => {
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => setIndex(0), [product]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentPhoto = product.photos?.[index];
  const imgUrl = currentPhoto?.url || currentPhoto;
  const hasFilaments = currentPhoto?.filaments && currentPhoto.filaments.length > 0;
  const hasTexture = !!currentPhoto?.texture;

  return (
    <main className="product-card">
      <div className="gallery-pane">
        
        {/* THUMBNAILS AT THE TOP */}
        <div className="thumb-container">
          {product.photos?.map((photo, i) => {
            const thumbUrl = photo?.url || photo;
            return (
              <img key={i} src={thumbUrl} onClick={() => setIndex(i)} 
                   className={`thumb ${index === i ? 'active' : ''}`} alt="" />
            );
          })}
        </div>

        {/* MAIN IMAGE AT THE BOTTOM */}
        <div className="main-image-container">
          {product.photos?.length > 0 ? (
            <div className="image-wrapper">
              <img src={imgUrl} className="main-img" alt="" />
              
              {(hasFilaments || hasTexture) && (
                <div className="image-caption">
                  {hasFilaments && (
                    <div className="caption-line">
                      <span className="caption-label">Printed with - </span>
                      <span className="filament-list">{currentPhoto.filaments.join(', ').toUpperCase()}</span>
                    </div>
                  )}
                  {hasTexture && (
                    <div className="caption-line">
                      <span className="caption-label">Surface Texture - </span>
                      <span className="texture-tag">{currentPhoto.texture.toUpperCase()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="placeholder" style={{ fontFamily: 'Space Mono', color: '#888' }}>PICTURE TO COME</div>
          )}
        </div>

      </div>

      <div className="details-pane">
        <h2 className="product-title">{product.displayName}</h2>
        
        {/* PRICE DISPLAY */}
        {product.price && product.price !== "0.00" && (
          <div className="price-tag">${product.price}</div>
        )}
        
        <div className="description-box">{product.description}</div>
        <button onClick={handleShare} className="share-btn">
          <i className="fa-solid fa-share-nodes"></i>
          {copied ? "[ COPIED! ]" : "[ SHARE ]"}
        </button>
      </div>
    </main>
  );
};