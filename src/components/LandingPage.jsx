import { Watermark } from './Watermark';
import { CardImage } from './CardImage';
import { firstPhotoUrl } from '../lib/photos';
import { DesignedMark } from './DesignedMark';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// The storefront's front door: a way into the catalogue, then the featured
// products themselves. The first strip exists because the page used to be a grid
// and nothing else, with no route into the categories from here.
//
// A strip of the colours currently on the shelf used to close the page. It went
// because it was the third place on one screen to say the same thing — the bar
// at the top has a Colours route, and the colour library is a page of its own —
// and it was pushing the footer a screen further down for it.
export const LandingPage = ({ catalogue, settings, intro, subtext, note }) => {
  // An empty field means the owner does not want that line shown at all, so we
  // render each paragraph only when it has content (no hardcoded fallback copy)
  // and drop the whole welcome box when every line is blank.
  const introText = (intro || '').trim();
  const subtextText = (subtext || '').trim();
  const noteText = (note || '').trim();
  const hasWelcome = introText || subtextText || noteText;

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

  // The order the owner set in the admin portal, newest first until they change
  // it. Without this the grid came out in the order walking the catalogue tree
  // happens to produce — category, then section, then position on the shelf —
  // which buried anything new at the bottom of the page.
  featuredProducts.sort((a, b) => (a.featuredOrder ?? 0) - (b.featuredOrder ?? 0));

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
            {featuredProducts.map((prod, i) => {
              const mainImg = firstPhotoUrl(prod);
              const href = `#${prod.categoryId}/${prod.subCategoryId}/${prod.id}`;
              return (
                <a key={href} href={href} className="grid-card">
                  <div className="card-img-container">
                    {/* No `priority` here: the welcome copy and the category
                        tiles sit above this grid, so the first card is usually
                        not the largest thing painted. */}
                    <CardImage url={mainImg} index={i} />
                    <Watermark product={prod} settings={settings} />
                    <DesignedMark product={prod} settings={settings} />
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

    </div>
  );
};
