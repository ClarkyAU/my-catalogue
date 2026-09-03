import { useEffect, useMemo, useState } from 'react';
import { Breadcrumb } from './Breadcrumb';
import { PhotoPlaceholder } from './PhotoPlaceholder';
import { ColourPicker } from './ColourPicker';
import { OptionPicker } from './OptionPicker';
import { CustomTextField } from './CustomTextField';
import { DesignedMark } from './DesignedMark';
import { CartIcon, ShareIcon } from './Icons';
import { loadFilaments } from '../lib/filaments.js';
import { shareUrl } from '../lib/shareLink.js';
import {
  MAIN_IMAGE,
  avifSrcSet,
  firstPhotoUrl,
  imageUrl,
  responsiveImage,
  srcSetDensity,
} from '../lib/photos.js';
import { CardImage, EAGER_CARDS } from './CardImage';
import { productParts } from '../lib/colourParts.js';
import { defaultSelections, productOptions } from '../lib/productOptions.js';
import { productCustomText } from '../lib/customText.js';
import { addToCart } from '../lib/cart.js';
import { useSwipe } from '../hooks/useSwipe.js';
import { TELEGRAM_URL } from '../lib/telegram.js';

// The main photo is shown "contain" inside a square frame that fills its column,
// so it is served from the fluid MAIN_IMAGE ladder rather than at one fixed
// width. The thumbs are genuinely 100px squares at every viewport, which is the
// one case where a 1x/2x density srcset is the right answer. The related cards
// below are the same square cards used everywhere else.
const THUMB_SIZE = { w: 100, h: 100 };

/**
 * What the main photo shows, for anyone who cannot see it. The filament and
 * texture are already captioned on screen for sighted visitors, so folding them
 * into the alt text gives a screen reader the same information.
 */
function describePhoto(name, photo) {
  const printedIn = photo?.filaments?.length ? ` printed in ${photo.filaments.join(', ')}` : '';
  const texture = photo?.texture ? `, ${photo.texture} texture` : '';
  return `${name}${printedIn}${texture}`;
}

// Rendered with a key of the active product slug, so switching products
// remounts this and both the selected photo and the chosen colours reset for
// free.
export const ProductDisplay = ({
  product,
  trail = [],
  path,
  settings,
  categoryName,
  subCategoryName,
  categoryHref,
  subCategoryHref,
  related = { items: [], scope: null },
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
  // The made-to-order choices this print offers beyond colour — which inlay,
  // which lid, and so on — usually none. Each starts on the owner's first answer
  // so there is always something concrete to put on the order.
  const options = useMemo(() => productOptions(product), [product]);
  const [selections, setSelections] = useState(() => defaultSelections(options));
  // The line of the customer's own words this print carries, if the owner turned
  // one on for it — a name, a date, a message. Null for most of the catalogue.
  const customText = useMemo(() => productCustomText(product), [product]);
  const [text, setText] = useState('');
  // A print that has to carry words cannot be made without them, so the order is
  // held until there are some rather than sending one Clarky has to chase.
  const textMissing = Boolean(customText?.required) && !text.trim();

  const photoCount = product.photos?.length || 0;
  // On a phone the main photo is most of the page and the thumb row is below the
  // fold, so swiping it is the only gesture that reaches the other photos
  // without scrolling away from the one on screen.
  const swipeRef = useSwipe({
    enabled: photoCount > 1,
    onNext: () => setIndex((i) => (i + 1) % photoCount),
    onPrevious: () => setIndex((i) => (i - 1 + photoCount) % photoCount),
  });

  const currentPhoto = product.photos?.[index];
  // Photos arrive as objects from the API, but the carried-over static data used
  // bare URL strings, so both shapes still have to work here.
  const mainPhotoUrl = currentPhoto?.url || currentPhoto || null;
  const main = responsiveImage(mainPhotoUrl, MAIN_IMAGE);
  const avifMain = avifSrcSet(mainPhotoUrl, MAIN_IMAGE);
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
      options: selections,
      text,
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
      {/* The trail and the share action share one row above the panels, so the
          panels themselves start clean at the top of the split. */}
      <div className="crumb-row">
        <Breadcrumb trail={trail} />
        <button type="button" className="share-btn small" onClick={handleShare}>
          <ShareIcon />
          {copied ? 'Link copied' : 'Share'}
        </button>
      </div>

      {/* Two independent columns rather than one welded card: the gallery is its
          own box, and every question the detail column asks is its own box too,
          so each reads as a separate thing to answer. */}
      <div className="split">

        <div className="panel gallery">
          <div className="main-image-container">
            {product.photos?.length > 0 ? (
              <div className="image-wrapper">
                {/* The main photo is the largest thing on this page, so it loads
                    eagerly at high priority while the thumbs can wait. It is the
                    content of this page rather than decoration, so unlike the
                    grid cards — where the product name sits in the same link —
                    it carries a real alt describing what is pictured. */}
                <picture>
                  {/* AVIF first, for the one image on the site where the extra
                      edge transform pays for itself. Anything that cannot decode
                      it skips this source entirely and takes the <img> below,
                      where the CDN negotiates WebP off the Accept header as
                      usual. */}
                  {avifMain && (
                    <source type="image/avif" srcSet={avifMain} sizes={main.sizes} />
                  )}
                  <img
                    ref={swipeRef}
                    src={main.src}
                    srcSet={main.srcSet}
                    sizes={main.sizes}
                    className="main-img"
                    alt={describePhoto(product.displayName, currentPhoto)}
                    decoding="async"
                    fetchPriority="high"
                  />
                </picture>

                {/* Pinned to a top corner rather than the corner the watermark
                    setting frees up: the main photo carries no watermark to keep
                    clear of, and the printed-with caption runs along the bottom
                    of this frame. */}
                <DesignedMark product={product} position="top-right" />

                {(currentPhoto?.filaments || currentPhoto?.texture) && (
                  <div className="image-caption">
                    {currentPhoto.filaments && (
                      <span className="caption-line">
                        <span className="caption-label">Printed with</span>
                        <span className="filament-list">
                          {currentPhoto.filaments.join(', ')}
                        </span>
                      </span>
                    )}
                    {currentPhoto.texture && (
                      <span className="caption-line">
                        <span className="caption-label">Surface texture</span>
                        <span className="texture-tag">{currentPhoto.texture}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <PhotoPlaceholder />
            )}
          </div>

          {/* The thumbs are buttons rather than clickable images: an <img> with an
              onClick cannot be reached or activated from the keyboard at all. */}
          {product.photos?.length > 1 && (
            <div className="thumb-row" role="group" aria-label={`${product.displayName} photos`}>
              {product.photos.map((img, i) => {
                const url = img.url || img;
                return (
                  <button
                    key={i}
                    type="button"
                    className={`thumb-btn ${index === i ? 'active' : ''}`}
                    onClick={() => setIndex(i)}
                    aria-pressed={index === i}
                    aria-label={`Show photo ${i + 1} of ${product.photos.length}`}
                  >
                    <img
                      src={imageUrl(url, THUMB_SIZE)}
                      srcSet={srcSetDensity(url, THUMB_SIZE)}
                      className="thumb"
                      alt=""
                      loading="lazy"
                      decoding="async"
                      width="100"
                      height="100"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="stack">

          <div className="panel">
            <h2 className="product-title">{product.displayName}</h2>
            {product.price && product.price !== '0.00' && (
              <p className="price-tag">${product.price}</p>
            )}
            {/* Nothing here is held in stock as a finished item — it is printed
                once ordered, which is the single most useful thing to know
                before choosing a colour. */}
            <div className="head-meta">
              <span className="made-to-order">Made to order</span>
            </div>
          </div>

          {product.description && (
            <div className="panel">
              <div className="panel-head">
                <span className="panel-label">ABOUT THIS PRINT</span>
              </div>
              <div className="description-box">{product.description}</div>
            </div>
          )}

          {/* Asked before colour: which version of the print it is decides what
              there is to colour in the first place. */}
          {options.length > 0 && (
            <OptionPicker options={options} value={selections} onChange={setSelections} />
          )}

          {/* Always shown, even with nothing on the shelf, because the request for
              a colour we don't carry is exactly the case that needs asking. */}
          <ColourPicker parts={parts} inStock={inStock} value={colours} onChange={setColours} />

          {/* Last of the questions: everything above decides which version of
              the print is being made, and this is what goes on the one chosen. */}
          {customText && (
            <CustomTextField config={customText} value={text} onChange={setText} />
          )}

          <div className="panel">
            <button className="order-btn wide" onClick={handleAdd} disabled={textMissing}>
              <CartIcon />
              {added ? 'Added to cart' : 'Add to cart'}
            </button>
            <div className="foot-links">
              <span>Need something different, or a colour that is not listed?</span>
              <a href={TELEGRAM_URL} target="_blank" rel="noreferrer">
                Message Clarky →
              </a>
            </div>
          </div>

        </div>
      </div>

      {related.items.length > 0 && (
        // The row is capped at what the same shelf holds, and only widens to the
        // rest of the category when that shelf is nearly empty — so the heading
        // names whichever of the two the row actually came from rather than
        // claiming more kinship than there is.
        <section className="strip related-strip">
          <h3 className="sub-head">
            <a
              className="sub-head-name"
              href={related.scope === 'sub' ? subCategoryHref : categoryHref}
            >
              More from {related.scope === 'sub' ? subCategoryName : categoryName}
              <span className="sub-head-arrow" aria-hidden="true">→</span>
            </a>
          </h3>
          <div className="product-grid">
            {related.items.map(({ key, product: item, href, subName }) => {
              const img = firstPhotoUrl(item);
              return (
                <a key={key} href={href} className="grid-card">
                  <div className="card-img-container">
                    {/* Always below the fold: this row is under the gallery and
                        every question the page asks, so it stays lazy. */}
                    <CardImage url={img} index={EAGER_CARDS} />
                    <DesignedMark product={item} settings={settings} />
                  </div>
                  <div className="card-details">
                    <h4 className="card-name">{item.displayName}</h4>
                    <div className="card-meta">
                      {item.price && item.price !== '0.00' && (
                        <span className="card-price">${item.price}</span>
                      )}
                      {/* Only worth saying when the row reached outside this
                          product's own section. */}
                      {related.scope === 'category' && (
                        <span className="card-category">{subName}</span>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
};
