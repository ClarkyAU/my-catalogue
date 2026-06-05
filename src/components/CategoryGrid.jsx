import React from 'react';

export const CategoryGrid = ({ category, categoryId }) => {
  if (!category || !category.products) return null;

  const products = Object.values(category.products);

  return (
    <div className="landing-page">
      <h2 className="section-title">{category.displayName}</h2>
      <div className="product-grid">
        {products.map((prod, i) => {
          const mainImg = prod.photos?.[0]?.url || prod.photos?.[0];
          return (
            <a key={i} href={`#${categoryId}/${prod.id}`} className="grid-card">
              <div className="card-img-container">
                {mainImg ? (
                  <img src={mainImg} alt="" />
                ) : (
                  <div className="placeholder" style={{ fontFamily: 'Space Mono', color: '#888', textAlign: 'center', paddingTop: '40%' }}>
                    PICTURE TO COME
                  </div>
                )}
              </div>
              <div className="card-details">
                <h3>{prod.displayName}</h3>
                {prod.price && prod.price !== "0.00" && (
                  <span className="card-price">${prod.price}</span>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
};