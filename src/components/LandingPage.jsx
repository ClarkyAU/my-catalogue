import { useEffect, useState } from 'react';
import { Watermark } from './Watermark';
import { PhotoPlaceholder } from './PhotoPlaceholder';
import { firstPhotoUrl, imageUrl, srcSet } from '../lib/photos';
import { loadFilaments } from '../lib/filaments.js';
import { swatchStyle } from '../lib/filamentSwatch.js';

// Cards are square and render at 560px at their widest, so that is the size the
// Image CDN is asked for rather than the full-resolution upload.
const CARD_SIZE = { w: 560, h: 560 };

// How many stocked colours the landing strip shows before it stops and points at
// the full library. Enough to read as a real palette, short enough that it stays
// one or two rows on a laptop.
const SWATCH_LIMIT = 12;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// The storefront's front door. Three strips under the featured grid's title:
// a way into the catalogue, the featured products themselves, and what is
// actually on the shelf to print them in. The first and third exist because the
// page used to be a grid and nothing else — there was no route into the
// categories from here, and no sign the colour library existed.
export const LandingPage = ({ catalogue, settings, intro, subtext, note }) => {
  // An empty field means the owner does not want that line shown at all, so we
  // render each paragraph only when it has content (no hardcoded fallback copy)
  // and drop the whole welcome box when every line is blank.
  const introText = (intro || '').trim();
  const subtextText = (subtext || '').trim();
  const noteText = (note || '').trim();
  const hasWelcome = introText || subtextText || noteText;

  // Only what is on the shelf right now. The full library, including what is on
  // order or out of stock, stays on the Colours page.
  const [inStock, setInStock] = useState([]);

  useEffect(() => {
    let cancelled = false;
    loadFilaments().then((list) => {
      if (!cancelled) setInStock(list.filter((f) => f.status === 'In Stock'));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = Object.entries(catalogue).map(([catId, category]) => {
    const subCategories = Object.values(category.subCategories || {});
    return {
      id: catId,
      name: category.displayName,
      accent: category.theme?.themeColor,
      subs: subCategories.length,
      items: subCategories.reduce(
        (total, sub) => total + Object.keys(sub.products || {}).length,
        0,
      ),
    };
  });

  const featuredProducts = [];

  Object.entries(catalogue).forEach(([catId, category]) => {
    Object.entries(category.subCategories || {}).forEach(([subId, subCat]) => {
      Object.values(subCat.products || {}).forEach((product) => {
        if (product.featured) {
          featuredProducts.push({
            ...product, categoryId: catId, subCategoryId: subId,
            categoryName: category.displayName, subCategoryName: subCat.displayName
          });
        }
      });
    });
  });

  return (
    <div className="landing-page">
      <h2 className="page-title">FEATURED ITEMS</h2>
      {hasWelcome && (
        <div className="welcome-message">
          {introText && <p>{introText}</p>}
          {subtextText && <p className="welcome-lead">{subtextText}</p>}
          {noteText && <p className="welcome-note">{noteText}</p>}
        </div>
      )}

      {categories.length > 0 && (
        <section className="strip">
          <h3 className="strip-title">
            BROWSE THE CATALOGUE
            <span className="strip-count">{plural(categories.length, 'category', 'categories')}</span>
          </h3>
          <div className="cat-row">
            {categories.map((cat) => (
              // Each tile carries its own category's accent on its edge, so the
              // colour the page turns after the tap is announced before it.
              <a
                key={cat.id}
                href={`#${cat.id}`}
                className="cat-tile"
                style={cat.accent ? { '--tile': cat.accent } : undefined}
              >
                <span className="cat-tile-name">{cat.name}</span>
                <span className="cat-tile-count">
                  {plural(cat.subs, 'section', 'sections')} · {plural(cat.items, 'item', 'items')}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="strip">
        <h3 className="strip-title">
          LATEST RELEASES
          <span className="strip-count">{plural(featuredProducts.length, 'item', 'items')}</span>
        </h3>

        {featuredProducts.length === 0 ? (
          <div className="landing-empty">
            <h2>NO FEATURED ITEMS YET</h2>
            <p>Tick "Featured" on a product in the admin portal to show it here.</p>
          </div>
        ) : (
          <div className="product-grid">
            {featuredProducts.map((prod) => {
              const mainImg = firstPhotoUrl(prod);
              const href = `#${prod.categoryId}/${prod.subCategoryId}/${prod.id}`;
              return (
                <a key={href} href={href} className="grid-card">
                  <div className="card-img-container">
                    {mainImg ? (
                      <img
                        src={imageUrl(mainImg, CARD_SIZE)}
                        srcSet={srcSet(mainImg, CARD_SIZE)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        width="560"
                        height="560"
                      />
                    ) : (
                      <PhotoPlaceholder />
                    )}
                    <Watermark product={prod} settings={settings} />
                  </div>
                  <div className="card-details">
                    <h4 className="card-name">{prod.displayName}</h4>
                    <div className="card-meta">
                      {prod.price && prod.price !== "0.00" && (
                        <span className="card-price">${prod.price}</span>
                      )}
                      <span className="card-category">{prod.subCategoryName}</span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>

      {inStock.length > 0 && (
        <section className="strip">
          <h3 className="strip-title">
            COLOURS ON THE SHELF
            <span className="strip-count">{inStock.length} in stock</span>
          </h3>
          <div className="swatch-row">
            {inStock.slice(0, SWATCH_LIMIT).map((filament) => (
              <span className="swatch" key={filament.id}>
                {/* Decorative here: the name is right underneath it. */}
                <span className="swatch-dot" style={swatchStyle(filament)} aria-hidden="true" />
                <span className="swatch-name">{filament.name}</span>
              </span>
            ))}
          </div>
          <div className="stock-note">
            <span className="filament-status in-stock">In Stock</span>
            <p>
              Every colour above is on the shelf right now. Pick one per part when you order, or
              leave it to Clarky.
            </p>
            <a className="share-btn small" href="#colours">
              See the full library
            </a>
          </div>
        </section>
      )}
    </div>
  );
};
