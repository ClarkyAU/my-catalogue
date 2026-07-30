import { Watermark } from './Watermark';
import { PhotoPlaceholder } from './PhotoPlaceholder';
import { firstPhotoUrl } from '../lib/photos';

export const LandingPage = ({ catalogue, settings, intro, subtext, note }) => {
  // An empty field means the owner does not want that line shown at all, so we
  // render each paragraph only when it has content (no hardcoded fallback copy)
  // and drop the whole welcome box when every line is blank.
  const introText = (intro || '').trim();
  const subtextText = (subtext || '').trim();
  const noteText = (note || '').trim();
  const hasWelcome = introText || subtextText || noteText;

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
      <h2 className="section-title">FEATURED ITEMS</h2>
      {hasWelcome && (
        <div className="welcome-message">
          {introText && <p>{introText}</p>}
          {subtextText && <p className="welcome-lead">{subtextText}</p>}
          {noteText && <p className="welcome-note">{noteText}</p>}
        </div>
      )}

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
                    <img src={mainImg} alt="" loading="lazy" decoding="async" width="560" height="560" />
                  ) : (
                    <PhotoPlaceholder />
                  )}
                  <Watermark product={prod} settings={settings} />
                </div>
                <div className="card-details">
                  <h3>{prod.displayName}</h3>
                  {prod.price && prod.price !== "0.00" && <span className="card-price">${prod.price}</span>}
                  <span className="card-category">{prod.subCategoryName}</span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};
