import React from 'react';

export const LandingPage = ({ catalogue }) => {
  const featuredProducts = [];
  
  Object.entries(catalogue).forEach(([catId, category]) => {
    Object.entries(category.subCategories || {}).forEach(([subId, subCat]) => {
      Object.entries(subCat.products || {}).forEach(([prodId, product]) => {
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
      <h2 className="section-title">NEW PRODUCTS</h2>
      <div className="welcome-message" style={{ fontFamily: "'Space Mono', monospace", textAlign: 'center', color: '#F5F0E6', fontSize: '1rem', lineHeight: '1.6', padding: '25px', maxWidth: '700px', margin: '0 auto 40px auto', background: '#1A1A1A', border: '2px dashed #333', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <p style={{ margin: 0 }}>I am currently working on a batch of new products, so keep an eye out for updates.</p>
        <p style={{ margin: 0, color: 'var(--theme-color)', fontWeight: 'bold' }}>Check out the latest releases below, or hit [ MY CATALOGUE ] above to browse every category and product.</p>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#888' }}>If there is anything you would like that is not listed, shoot me a message via the order button.</p>
      </div>

      {featuredProducts.length === 0 ? (
        <div className="landing-empty" style={{ textAlign: 'center', marginTop: '40px' }}>
          <h2>NO NEW PRODUCTS YET</h2>
          <p style={{ fontFamily: "'Space Mono', monospace" }}>Add "featured": true to a product's metadata.json to see it here.</p>
        </div>
      ) : (
        <div className="product-grid">
          {featuredProducts.map((prod, i) => {
            const mainImg = prod.photos?.[0]?.url || prod.photos?.[0];
            return (
              <a key={i} href={`#${prod.categoryId}/${prod.subCategoryId}/${prod.id}`} className="grid-card">
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