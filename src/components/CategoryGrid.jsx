import { Breadcrumb } from './Breadcrumb';
import { PhotoPlaceholder } from './PhotoPlaceholder';
import { firstPhotoUrl } from '../lib/photos';

export const CategoryGrid = ({ subCategory, categoryId, subCategoryId, trail = [] }) => {
  if (!subCategory || !subCategory.products) return null;
  const products = Object.values(subCategory.products);

  return (
    <div className="landing-page">
      <h2 className="section-title">{subCategory.displayName}</h2>
      <Breadcrumb trail={trail} />
      <div className="product-grid">
        {products.map((prod) => {
          const mainImg = firstPhotoUrl(prod);
          return (
            <a key={prod.id} href={`#${categoryId}/${subCategoryId}/${prod.id}`} className="grid-card">
              <div className="card-img-container">
                {mainImg ? (
                  <img src={mainImg} alt="" loading="lazy" decoding="async" width="560" height="560" />
                ) : (
                  <PhotoPlaceholder />
                )}
              </div>
              <div className="card-details">
                <h3>{prod.displayName}</h3>
                {prod.price && prod.price !== "0.00" && <span className="card-price">${prod.price}</span>}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
};
