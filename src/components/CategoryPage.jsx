import React from 'react';

// Full listing of every product in a category, flattened across its
// sub-categories. Styled to match the NEW PRODUCTS landing grid so the whole
// site feels consistent when a shopper clicks a category in the menu.
export const CategoryPage = ({ category, categoryId }) => {
  if (!category) return null;

  const products = [];
  Object.entries(category.subCategories || {}).forEach(([subId, subCat]) => {
    Object.values(subCat.products || {}).forEach((product) => {
      products.push({ ...product, subCategoryId: subId, subCategoryName: subCat.displayName });
    });
  });

  return (
    <div className="landing-page">
      <h2 className="section-title">{category.displayName}</h2>

      {products.length === 0 ? (
        <div className="landing-empty" style={{ textAlign: 'center', marginTop: '40px' }}>
          <h2>NO PRODUCTS YET</h2>
          <p style={{ fontFamily: "'Space Mono', monospace" }}>Check back soon for items in this category.</p>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((prod, i) => {
            const mainImg = prod.photos?.[0]?.url || prod.photos?.[0];
            return (
              <a key={i} href={`#${categoryId}/${prod.subCategoryId}/${prod.id}`} className="grid-card">
                <div className="card-img-container">
                  {mainImg ? <img src={mainImg} alt="" /> : <div className="placeholder" style={{ fontFamily: 'Space Mono', color: '#888', textAlign: 'center', paddingTop: '40%' }}>PICTURE TO COME</div>}
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
