import { useEffect, useMemo, useState } from 'react';
import { Breadcrumb } from './Breadcrumb';
import { PhotoPlaceholder } from './PhotoPlaceholder';
import { ColourPicker } from './ColourPicker';
import { CartIcon, ShareIcon } from './Icons';
import { useFitText } from '../hooks/useFitText';
import { loadFilaments } from '../lib/filaments.js';
import { shareUrl } from '../lib/shareLink.js';
import { firstPhotoUrl } from '../lib/photos.js';
import { productParts } from '../lib/colourParts.js';
import { addToCart } from '../lib/cart.js';

// Rendered with a key of the active product slug, so switching products
// remounts this and both the selected photo and the chosen colours reset for
// free.
export const ProductDisplay = ({
  product,
  trail = [],
  path,
  categoryName,
  subCategoryName,
}) => {
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState(false);
  // Only colours actually on the shelf are offered here. The full library,
  // including what is on order or out of stock, lives on the Colours page.
  const [inStock, setInStock] = useState([]);
  // The pieces of this print that are coloured separately — usually none, in
  // which case there is a single unnamed slot for the whole thing.
  const parts = useMemo(() => productParts(product), [product]);
  // One entry per slot: { part, colour }, where a colour is a stocked filament
  // or { custom: true, note } for one we do not carry.
  const [colours, setColours] = useState(() =>
    (parts.length ? parts : [null]).map((part) => ({ part, colour: null })),
  );
  // Long product names shrink to fit rather than wrapping into the price.
  const titleRef = useFitText(product.displayName);

  const currentPhoto = product.photos?.[index];
  // The crawler-readable form of this page's URL, so a link pasted into a chat
  // previews as the product rather than the bare homepage.
  const productUrl = path ? shareUrl(path) : window.location.href;

  useEffect(() => {
    let cancelled = false;
    loadFilaments().then((list) => {
      if (!cancelled) setInStock(list.filter((f) => f.status === 'In Stock'));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAdd = () => {
    addToCart({
      path,
      name: product.displayName,
      price: product.price,
      categoryName,
      subCategoryName,
      photo: firstPhotoUrl(product),
      colours,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const handleShare = async () => {
    const shareData = {
      title: product.displayName,
      text: `Check out ${product.displayName} at Clarky3D`,
      url: productUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(productUrl);
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

        {/* Always shown, even with nothing on the shelf, because the request for
            a colour we don't carry is exactly the case that needs asking. */}
        <ColourPicker parts={parts} inStock={inStock} value={colours} onChange={setColours} />

        <div className="product-actions">
          <button className="order-btn" onClick={handleAdd}>
            <CartIcon />
            {added ? 'ADDED TO CART' : 'ADD TO CART'}
          </button>
          <button className="share-btn" onClick={handleShare}>
            <ShareIcon />
            {copied ? 'LINK COPIED' : 'SHARE'}
          </button>
        </div>
      </div>
    </div>
    </>
  );
};
