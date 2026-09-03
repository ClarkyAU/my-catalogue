import { useState } from 'react';
import { api } from '../api.js';
import { useCatalogueStore } from '../useCatalogueTree.js';
import { Splash } from './Splash.jsx';

/**
 * The Featured Items page, in the order it will be read.
 *
 * Featuring an item is a tick on the product itself, several categories down the
 * tree, so before this panel there was nowhere that showed what the front page
 * actually looked like — and no way to say what should lead it. Newly featured
 * items go straight to the top on their own; this is for the times that is not
 * where the owner wants them.
 */
export function FeaturedOrder() {
  const { tree, loading, reload } = useCatalogueStore();
  const [moving, setMoving] = useState(0);
  const [err, setErr] = useState('');

  // Featured items come from every corner of the tree, so they are gathered here
  // and put in the page's own order rather than the tree's.
  const featured = [];
  for (const cat of tree) {
    for (const sub of cat.subcategories || []) {
      for (const prod of sub.products || []) {
        if (prod.featured) featured.push({ ...prod, where: `${cat.displayName} / ${sub.displayName}` });
      }
    }
  }
  featured.sort((a, b) => (a.featuredOrder ?? 0) - (b.featuredOrder ?? 0));

  const move = async (id, direction) => {
    setMoving(id);
    setErr('');
    try {
      await api(`/products/${id}/featured-order`, { method: 'POST', body: { direction } });
      // The server renumbers every featured item, so the whole tree is refetched
      // rather than guessing the new positions here.
      await reload();
    } catch (e) {
      setErr(e.message);
    } finally {
      setMoving(0);
    }
  };

  return (
    <section className="a-settings">
      <h2 className="a-settings-title">FEATURED ITEMS ORDER</h2>
      <p className="a-settings-hint">
        The order these appear on the home page, top first. Anything newly featured starts at the top.
      </p>

      {err && <p className="a-error">{err}</p>}

      {/* Opening straight onto this page means the tree may still be arriving.
          An empty list looks the same as nothing being featured, so say which. */}
      {loading ? (
        <Splash text="LOADING…" inline />
      ) : featured.length === 0 ? (
        <p className="a-muted">
          Nothing is featured yet. Tick “Featured” on a product over on the Catalogue page to put it on
          the home page.
        </p>
      ) : (
        <ol className="a-feat-list">
          {featured.map((prod, i) => (
            <li className="a-feat-row" key={prod.id}>
              <div className="a-fil-reorder">
                <button
                  className="a-mini"
                  onClick={() => move(prod.id, 'up')}
                  disabled={i === 0 || moving !== 0}
                  title="Move up"
                >
                  ▲
                </button>
                <button
                  className="a-mini"
                  onClick={() => move(prod.id, 'down')}
                  disabled={i === featured.length - 1 || moving !== 0}
                  title="Move down"
                >
                  ▼
                </button>
              </div>
              <span className="a-feat-pos">{i + 1}</span>
              <span className="a-feat-name">{prod.displayName}</span>
              <span className="a-feat-where">{prod.where}</span>
              {/* A hidden product is featured but not on the page, which is worth
                  saying here — otherwise the list and the page disagree and this
                  panel looks broken. */}
              {prod.hidden && <span className="a-feat-flag">HIDDEN</span>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
