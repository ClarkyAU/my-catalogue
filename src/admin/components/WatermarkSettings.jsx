import { WATERMARK_STYLES, WATERMARK_POSITIONS, PRODUCT_BADGES } from '../../lib/watermark.js';
import { Watermark } from '../../components/Watermark.jsx';

// Controls the mark stamped over preview images on the Featured Items page for
// products flagged "New" or "Popular". The preview uses the very same component
// and stylesheet as the storefront, so what is shown here is what shoppers get.
export function WatermarkSettings({ values, set, loading, dirty, saving, saved, onSave }) {
  const enabled = values.watermarkEnabled !== 'false';
  const isStamp = values.watermarkStyle === 'stamp';
  const opacity = Number(values.watermarkOpacity) || 0.9;

  return (
    <section className="a-settings">
      <h2 className="a-settings-title">FEATURED WATERMARK</h2>
      <p className="a-settings-hint">
        The mark stamped over a product's preview image on the Featured Items page. Tick "New" or
        "Popular" on a product below to give it a mark. The mark follows each category's theme colour;
        Popular uses the warm accent so the two read differently.
      </p>

      <div className="a-wm">
        <div className="a-wm-controls">
          <label className="a-toggle">
            <input
              type="checkbox"
              checked={enabled}
              disabled={loading}
              onChange={(e) => set('watermarkEnabled', e.target.checked ? 'true' : 'false')}
            />
            <span>Show watermarks on the Featured Items page</span>
          </label>

          <div className="a-wm-row">
            <label className="a-field">
              <span>"New" text</span>
              <input
                className="a-input"
                maxLength={18}
                placeholder="NEW"
                value={values.watermarkNewLabel || ''}
                disabled={loading}
                onChange={(e) => set('watermarkNewLabel', e.target.value)}
              />
            </label>
            <label className="a-field">
              <span>"Popular" text</span>
              <input
                className="a-input"
                maxLength={18}
                placeholder="POPULAR"
                value={values.watermarkPopularLabel || ''}
                disabled={loading}
                onChange={(e) => set('watermarkPopularLabel', e.target.value)}
              />
            </label>
          </div>

          <div className="a-wm-row">
            <label className="a-field">
              <span>Style</span>
              <select
                className="a-input"
                value={values.watermarkStyle}
                disabled={loading}
                onChange={(e) => set('watermarkStyle', e.target.value)}
              >
                {WATERMARK_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
            <label className="a-field">
              <span>Corner</span>
              <select
                className="a-input"
                value={values.watermarkPosition}
                disabled={loading || isStamp}
                onChange={(e) => set('watermarkPosition', e.target.value)}
              >
                {WATERMARK_POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>
            <label className="a-field">
              <span>Strength {Math.round(opacity * 100)}%</span>
              <input
                className="a-range"
                type="range"
                min="0.2"
                max="1"
                step="0.05"
                value={opacity}
                disabled={loading}
                onChange={(e) => set('watermarkOpacity', e.target.value)}
              />
            </label>
          </div>

          {isStamp && <p className="a-settings-hint a-wm-note">The diagonal stamp always sits in the middle of the image, so the corner setting does not apply to it.</p>}
        </div>

        <div className="a-wm-preview">
          {PRODUCT_BADGES.filter((b) => b.value !== 'none').map((badge) => (
            <div className="a-wm-tile" key={badge.value}>
              <div className="a-wm-frame">
                {enabled && <Watermark product={{ badge: badge.value }} settings={values} />}
              </div>
              <span className="a-wm-caption">{badge.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="a-prod-actions">
        <button className="a-btn a-btn-sm" onClick={onSave} disabled={loading || !dirty || saving}>
          {saving ? 'SAVING…' : saved ? 'SAVED ✓' : 'SAVE WATERMARK'}
        </button>
      </div>
    </section>
  );
}
