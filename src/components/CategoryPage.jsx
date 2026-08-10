// Landing view for a top-level category. Instead of dumping every product, it
// shows the category's sub-categories as cards, each previewing up to four of
// its products, so shoppers can drill down one level at a time.
import { Breadcrumb } from './Breadcrumb';
import { firstPhotoUrl, imageUrl, srcSet } from '../lib/photos';

const PREVIEW_LIMIT = 4;

// Preview tiles are small squares, so they are fetched at tile size rather than
// pulling four full-resolution uploads per sub-category card.
const THUMB_SIZE = { w: 280, h: 280 };

export const CategoryPage = ({ category, categoryId, trail = [] }) => {
  if (!category) return null;

  const subCategories = Object.values(category.subCategories || {});

  return (
    <div className="landing-page">
      <h2 className="section-title">{category.displayName}</h2>
      <Breadcrumb trail={trail} />

      {subCategories.length === 0 ? (
        <div className="landing-empty">
          <h2>NO PRODUCTS YET</h2>
          <p>Check back soon for items in this category.</p>
        </div>
      ) : (
        <div className="product-grid">
          {subCategories.map((sub) => {
            const products = Object.values(sub.products || {});
            const preview = products.slice(0, PREVIEW_LIMIT);
            // Keep the thumbnail block a balanced square: 1 up to 4 tiles, with a
            // filler cell when there are exactly three so the grid stays even.
            const tiles = preview.length === 3 ? [...preview, null] : preview;
            const cellCount = Math.min(Math.max(preview.length, 1), 4);

            return (
              <a key={sub.id} href={`#${categoryId}/${sub.id}`} className="grid-card subcat-card">
                <div className={`subcat-thumbs n${cellCount}`}>
                  {preview.length === 0 ? (
                    <div className="subcat-thumb empty">SOON</div>
                  ) : (
                    tiles.map((prod, i) => {
                      const img = prod && firstPhotoUrl(prod);
                      return (
                        <div key={i} className="subcat-thumb">
                          {img ? (
                            <img
                              src={imageUrl(img, THUMB_SIZE)}
                              srcSet={srcSet(img, THUMB_SIZE)}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              width="280"
                              height="280"
                            />
                          ) : (
                            <span className="subcat-thumb-ph">□</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="card-details">
                  <h3>{sub.displayName}</h3>
                  <span className="card-category">
                    {products.length} {products.length === 1 ? 'ITEM' : 'ITEMS'}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};
