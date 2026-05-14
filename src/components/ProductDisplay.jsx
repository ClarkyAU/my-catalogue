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

  return (
    <main className="product-card">
      <div className="gallery-pane">
        <div className="main-image-container">
          {product.photos?.length > 0 ? (
            <img src={product.photos[index]} className="main-img" alt="" />
          ) : (
            <div className="placeholder">PICTURE TO COME</div>
          )}
        </div>
        <div className="thumbnail-row">
          {product.photos?.map((img, i) => (
            <img key={i} src={img} onClick={() => setIndex(i)} 
                 className={`thumb ${index === i ? 'active' : ''}`} alt="" />
          ))}
        </div>
      </div>

      <div className="details-pane">
        <h2 className="product-title">{product.displayName}</h2>
        <div className="description-box">{product.description}</div>
        <button onClick={handleShare} className="share-btn">
          {copied ? "[ COPIED! ]" : "[ SHARE ]"}
        </button>
      </div>
    </main>
  );
};