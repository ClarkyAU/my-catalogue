import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { WATERMARK_DEFAULTS } from '../../lib/watermark.js';
import { WatermarkSettings } from './WatermarkSettings.jsx';

// The three lines of the Featured Items welcome message. Editing these keeps the
// admin in sync with exactly what the storefront shows.
const TEXT_FIELDS = [
  { key: 'landingIntro', label: 'Intro message', rows: 3 },
  { key: 'landingSubtext', label: 'Highlighted line', rows: 2 },
  { key: 'landingNote', label: 'Footnote', rows: 2 },
];

const TEXT_KEYS = TEXT_FIELDS.map((f) => f.key);
const WATERMARK_KEYS = Object.keys(WATERMARK_DEFAULTS);

// Both panels below edit the same settings endpoint, so they share one load and
// one pool of values — each panel just saves its own keys.
export function SiteSettings() {
  const [values, setValues] = useState({ ...WATERMARK_DEFAULTS });
  const [original, setOriginal] = useState({ ...WATERMARK_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [savingGroup, setSavingGroup] = useState('');
  const [savedGroup, setSavedGroup] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    api('/settings')
      .then((data) => {
        if (cancelled) return;
        const picked = { ...WATERMARK_DEFAULTS };
        for (const key of [...TEXT_KEYS, ...WATERMARK_KEYS]) {
          if (data[key] !== undefined) picked[key] = data[key];
          else if (TEXT_KEYS.includes(key)) picked[key] = '';
        }
        setValues(picked);
        setOriginal(picked);
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = (key, value) => setValues((v) => ({ ...v, [key]: value }));
  const isDirty = (keys) => keys.some((key) => values[key] !== original[key]);

  const save = async (group, keys) => {
    setSavingGroup(group);
    setErr('');
    try {
      const body = {};
      for (const key of keys) body[key] = values[key];
      const data = await api('/settings', { method: 'PATCH', body });
      // Take back what the server stored (it clamps and trims), so the panel
      // settles into a clean state showing the values that are really live.
      const settled = { ...values };
      for (const key of keys) if (data[key] !== undefined) settled[key] = data[key];
      setValues(settled);
      setOriginal((o) => ({ ...o, ...settled }));
      setSavedGroup(group);
      setTimeout(() => setSavedGroup(''), 1500);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSavingGroup('');
    }
  };

  return (
    <>
      <section className="a-settings">
        <h2 className="a-settings-title">SITE TEXT</h2>
        <p className="a-settings-hint">The welcome message shown on the Featured Items home page. Leave a field empty to hide that line.</p>
        {TEXT_FIELDS.map(({ key, label, rows }) => (
          <label className="a-field" key={key}>
            <span>{label}</span>
            <textarea
              className="a-input a-textarea"
              rows={rows}
              value={values[key] || ''}
              disabled={loading}
              onChange={(e) => set(key, e.target.value)}
            />
          </label>
        ))}
        {err && <p className="a-error">{err}</p>}
        <div className="a-prod-actions">
          <button
            className="a-btn a-btn-sm"
            onClick={() => save('text', TEXT_KEYS)}
            disabled={loading || !isDirty(TEXT_KEYS) || savingGroup === 'text'}
          >
            {savingGroup === 'text' ? 'SAVING…' : savedGroup === 'text' ? 'SAVED ✓' : 'SAVE TEXT'}
          </button>
        </div>
      </section>

      <WatermarkSettings
        values={values}
        set={set}
        loading={loading}
        dirty={isDirty(WATERMARK_KEYS)}
        saving={savingGroup === 'watermark'}
        saved={savedGroup === 'watermark'}
        onSave={() => save('watermark', WATERMARK_KEYS)}
      />
    </>
  );
}
