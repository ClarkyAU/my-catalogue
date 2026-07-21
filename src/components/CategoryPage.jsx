// Landing view for a top-level category. Instead of dumping every product, it
// shows the category's sub-categories as cards, each previewing up to four of
// its products, so shoppers can drill down one level at a time.
import { Breadcrumb } from './Breadcrumb';

const PREVIEW_LIMIT = 4;

const photoUrl = (product) => product?.photos?.[0]?.url || product?.photos?.[0] || null;

export const CategoryPage = ({ category, categoryId, trail = [] }) => {
  if (!category) return null;

  const subCategories = Object.values(category.subCategories || {});

  return (
    <div className="landing-page">
      <h2 className="section-title">{category.displayName}</h2>
      <Breadcrumb trail={trail} />

      {subCategories.length === 0 ? (
        <div className="landing-empty" style={{ textAlign: 'center', marginTop: '40px' }}>
          <h2>NO PRODUCTS YET</h2>
          <p style={{ fontFamily: "'Space Mono', monospace" }}>Check back soon for items in this category.</p>
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
                      const img = prod && photoUrl(prod);
                      return (
                        <div key={i} className="subcat-thumb">
                          {img ? <img src={img} alt="" loading="lazy" /> : <span className="subcat-thumb-ph">□</span>}
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
