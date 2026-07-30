import { useState } from 'react';
import { Breadcrumb } from './Breadcrumb';
import { PhotoPlaceholder } from './PhotoPlaceholder';
import { ShareIcon } from './Icons';
import { useFitText } from '../hooks/useFitText';

// Rendered with a key of the active product slug, so switching products
// remounts this and the selected photo resets to the first one for free.
export const ProductDisplay = ({ product, trail = [] }) => {
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  // Long product names shrink to fit rather than wrapping into the price.
  const titleRef = useFitText(product.displayName);

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
    <>
      <Breadcrumb trail={trail} />
      <div className="product-card">
      <div className="gallery-pane">
        <div className="main-image-container">
          {product.photos?.length > 0 ? (
            <div className="image-wrapper">
              {/* The main photo is the largest thing on this page, so it loads
                  eagerly at high priority while the thumbs can wait. */}
              <img
                src={currentPhoto?.url || currentPhoto}
                className="main-img"
                alt=""
                decoding="async"
                fetchPriority="high"
              />
              
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
            <PhotoPlaceholder />
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
              loading="lazy"
              decoding="async"
              width="100"
              height="100"
            />
          ))}
        </div>
      </div>
      
      <div className="details-pane">
        <h2 className="product-title" ref={titleRef}>{product.displayName}</h2>
        {product.price && product.price !== "0.00" && (
          <div className="price-tag">${product.price}</div>
        )}
        <div className="description-box">{product.description}</div>
        <button className="share-btn" onClick={handleShare}>
          <ShareIcon />
          {copied ? 'LINK COPIED' : 'SHARE'}
        </button>
      </div>
    </div>
    </>
  );
};