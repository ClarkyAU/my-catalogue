import { useState } from 'react';
import { api } from '../api.js';
import { fileToUpload } from '../image.js';
import { useFilamentStore } from '../useFilaments.js';

// Upload / caption / delete the example prints shown under a colour on the
// public Colours page.
export function FilamentPrints({ filament }) {
  const { reload } = useFilamentStore();
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const prints = Array.isArray(filament.prints) ? filament.prints : [];

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    setUploading(true);
    setErr('');
    try {
      for (const file of files) {
        const { dataBase64, contentType } = await fileToUpload(file);
        await api('/filament-photos', {
          method: 'POST',
          body: { filamentId: filament.id, dataBase64, contentType },
        });
      }
      reload();
    } catch (e2) {
      setErr(e2.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id) => {
    await api(`/filament-photos/${id}`, { method: 'DELETE' });
    reload();
  };

  return (
    <div className="a-fil-prints">
      <div className="a-fil-prints-head">
        <span>Examples</span>
        <label className="a-btn a-btn-sm a-upload">
          {uploading ? 'UPLOADING…' : '+ ADD EXAMPLE'}
          <input type="file" accept="image/*" multiple hidden onChange={onFiles} disabled={uploading} />
        </label>
      </div>
      {err && <p className="a-error">{err}</p>}
      <div className="a-fil-prints-strip">
        {prints.length === 0 && <span className="a-muted">No examples yet.</span>}
        {prints.map((print) => (
          <FilamentPrintCard key={print.id} print={print} filamentId={filament.id} onRemove={remove} />
        ))}
      </div>
    </div>
  );
}

// One example print: its thumbnail and the caption shown with it on the public
// page.
function FilamentPrintCard({ print, filamentId, onRemove }) {
  const { patchPrint } = useFilamentStore();
  const [caption, setCaption] = useState(print.caption || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');
  const dirty = caption !== (print.caption || '');

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      const clean = caption.trim();
      const row = await api(`/filament-photos/${print.id}`, { method: 'PATCH', body: { caption: clean } });
      setCaption(clean);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      patchPrint(filamentId, row);
    } catch (e) {
      setErr(e.message || 'Could not save the caption.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <figure className="a-fil-print">
      <img src={print.url} alt="" loading="lazy" decoding="async" />
      <input
        className="a-photo-input"
        value={caption}
        placeholder="Caption (optional)"
        onChange={(e) => setCaption(e.target.value)}
      />
      {err && <p className="a-error">{err}</p>}
      <div className="a-fil-print-actions">
        <button className="a-mini a-photo-save" onClick={save} disabled={!dirty || saving}>
          {saving ? 'saving…' : saved ? 'saved ✓' : 'save'}
        </button>
        <button className="a-mini a-mini-danger" onClick={() => onRemove(print.id)}>delete</button>
      </div>
    </figure>
  );
}
