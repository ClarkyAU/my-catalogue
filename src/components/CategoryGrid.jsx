import { Breadcrumb } from './Breadcrumb';
import { CardImage } from './CardImage';
import { firstPhotoUrl } from '../lib/photos';
import { DesignedMark } from './DesignedMark';

export const CategoryGrid = ({ subCategory, categoryId, subCategoryId, settings, trail = [] }) => {
  if (!subCategory || !subCategory.products) return null;
  const products = Object.values(subCategory.products);

  return (
    <div className="landing-page">
      <h2 className="page-title">{subCategory.displayName}</h2>
      <Breadcrumb trail={trail} />
      <div className="product-grid">
        {products.map((prod, i) => {
          const mainImg = firstPhotoUrl(prod);
          return (
            <a key={prod.id} href={`#${categoryId}/${subCategoryId}/${prod.id}`} className="grid-card">
              <div className="card-img-container">
                {/* This grid is the whole page, so its first card is the largest
                    thing painted and is marked as such. */}
                <CardImage url={mainImg} index={i} priority />
                <DesignedMark product={prod} settings={settings} />
              </div>
              <div className="card-details">
                <h3 className="card-name">{prod.displayName}</h3>
                {prod.price && prod.price !== "0.00" && (
                  <div className="card-meta">
                    <span className="card-price">${prod.price}</span>
                  </div>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
};
