// Landing view for a top-level category. Rather than one card per sub-category
// with a collage of cropped thumbnails inside it, each sub-category gets its own
// titled strip listing its actual products — the same card the rest of the site
// uses, with a name and a price on it.
//
// The collage it replaced had three problems this does not: a sub-category with
// three products left a dead black cell in the mosaic, one with a single product
// looked nothing like one with four, and none of the little squares said what
// they were. It also puts the products themselves one click closer, since the
// sub-category page is now a "see the rest" rather than the only way in.
import { Breadcrumb } from './Breadcrumb';
import { CardImage, EAGER_CARDS } from './CardImage';
import { firstPhotoUrl } from '../lib/photos';

// A full row of cards at the widest layout. Past this the strip shows one fewer
// product and spends the last slot on a link to the whole sub-category, so every
// strip stays exactly one row tall no matter how much is in it.
const ROW = 4;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const CategoryPage = ({ category, categoryId, trail = [] }) => {
  if (!category) return null;

  const subCategories = Object.values(category.subCategories || {});

  return (
    <div className="landing-page">
      <h2 className="page-title">{category.displayName}</h2>
      <Breadcrumb trail={trail} />

      {subCategories.length === 0 ? (
        <div className="landing-empty">
          <h2>NO PRODUCTS YET</h2>
          <p>Check back soon for items in this category.</p>
        </div>
      ) : (
        subCategories.map((sub, stripIndex) => {
          const products = Object.values(sub.products || {});
          const href = `#${categoryId}/${sub.id}`;
          // When there is more than a row's worth, hold the last slot back for
          // the "see the rest" tile instead of cutting the row off mid-shelf.
          const overflow = products.length > ROW;
          const shown = products.slice(0, overflow ? ROW - 1 : ROW);

          return (
            <section className="strip" key={sub.id}>
              <h3 className="sub-head">
                <a className="sub-head-name" href={href}>
                  {sub.displayName}
                  <span className="sub-head-arrow" aria-hidden="true">→</span>
                </a>
                <span className="strip-count">{plural(products.length, 'item', 'items')}</span>
              </h3>

              {products.length === 0 ? (
                <p className="strip-empty">Nothing in this section yet — check back soon.</p>
              ) : (
                <div className="product-grid">
                  {shown.map((prod, i) => {
                    const mainImg = firstPhotoUrl(prod);
                    return (
                      <a key={prod.id} href={`${href}/${prod.id}`} className="grid-card">
                        <div className="card-img-container">
                          {/* Only the top strip is on screen to begin with, so
                              only its row loads eagerly — every strip below it
                              hands CardImage an index past the eager cut-off. */}
                          <CardImage
                            url={mainImg}
                            index={stripIndex === 0 ? i : EAGER_CARDS}
                            priority={stripIndex === 0}
                          />
                        </div>
                        <div className="card-details">
                          <h4 className="card-name">{prod.displayName}</h4>
                          {prod.price && prod.price !== '0.00' && (
                            <div className="card-meta">
                              <span className="card-price">${prod.price}</span>
                            </div>
                          )}
                        </div>
                      </a>
                    );
                  })}

                  {/* Built from the same parts as a product card so it lines up
                      with them exactly, rather than being a short box on the end
                      of the row. */}
                  {overflow && (
                    <a href={href} className="grid-card more-card">
                      <div className="card-img-container">
                        <span className="more-count">+{products.length - shown.length}</span>
                      </div>
                      <div className="card-details">
                        <h4 className="card-name">See all {sub.displayName}</h4>
                        <div className="card-meta">
                          <span className="card-category">
                            {plural(products.length, 'item', 'items')}
                          </span>
                        </div>
                      </div>
                    </a>
                  )}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
};
