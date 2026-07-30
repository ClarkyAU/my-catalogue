import { useState } from 'react';
import { api } from '../api.js';
import { fileToUpload } from '../image.js';
import { useCatalogueStore } from '../useCatalogueTree.js';

// Upload / reorder-by-default / delete the photos on a product, plus the
// per-image print details the storefront shows as a caption.
export function PhotoGrid({ product }) {
  const { reload } = useCatalogueStore();
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    setUploading(true);
    setErr('');
    try {
      for (const file of files) {
        const { dataBase64, contentType } = await fileToUpload(file);
        await api('/photos', {
          method: 'POST',
          body: { productId: product.id, dataBase64, contentType },
        });
      }
      reload();
    } catch (e2) {
      setErr(e2.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Adding, removing or re-defaulting a photo changes the tree's shape (and the
  // server may promote a different default), so these still refetch.
  const setDefault = async (id) => {
    await api(`/photos/${id}/default`, { method: 'POST' });
    reload();
  };

  const remove = async (id) => {
    await api(`/photos/${id}`, { method: 'DELETE' });
    reload();
  };

  return (
    <div className="a-photos">
      <div className="a-photos-head">
        <span>Photos</span>
        <label className="a-btn a-btn-sm a-upload">
          {uploading ? 'UPLOADING…' : '+ UPLOAD'}
          <input type="file" accept="image/*" multiple hidden onChange={onFiles} disabled={uploading} />
        </label>
      </div>
      {err && <p className="a-error">{err}</p>}
      <div className="a-photo-strip">
        {product.photos.length === 0 && <span className="a-muted">No photos yet.</span>}
        {product.photos.map((photo) => (
          <PhotoCard key={photo.id} photo={photo} onSetDefault={setDefault} onRemove={remove} />
        ))}
      </div>
    </div>
  );
}

// A single photo tile: preview, default/delete controls, plus the per-image
// print details (which filament(s) were used and any surface texture) that the
// storefront shows as a caption under the main image.
function PhotoCard({ photo, onSetDefault, onRemove }) {
  const { patchPhoto } = useCatalogueStore();
  const initialFilaments = (photo.filaments || []).join(', ');
  const initialTexture = photo.texture || '';
  const [filaments, setFilaments] = useState(initialFilaments);
  const [texture, setTexture] = useState(initialTexture);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  const dirty = filaments !== initialFilaments || texture !== initialTexture;

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      const list = filaments.split(',').map((s) => s.trim()).filter(Boolean);
      const cleanTexture = texture.trim();
      const row = await api(`/photos/${photo.id}`, {
        method: 'PATCH',
        body: { filaments: list, texture: cleanTexture },
      });
      // Normalise the inputs to match what the server stored so the form
      // settles back to a clean (non-dirty) state.
      setFilaments(list.join(', '));
      setTexture(cleanTexture);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      patchPhoto(row);
    } catch (e) {
      setErr(e.message || 'Could not save the details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <figure className={`a-photo ${photo.isDefault ? 'is-default' : ''}`}>
      <img src={photo.url} alt="" loading="lazy" decoding="async" />
      <figcaption>
        {photo.isDefault ? (
          <span className="a-default-tag">★ DEFAULT</span>
        ) : (
          <button className="a-mini" onClick={() => onSetDefault(photo.id)}>set default</button>
        )}
        <button className="a-mini a-mini-danger" onClick={() => onRemove(photo.id)}>delete</button>
      </figcaption>
      <div className="a-photo-meta">
        <label>
          <span>Filament(s)</span>
          <input
            className="a-photo-input"
            value={filaments}
            placeholder="e.g. Red PLA, Black PETG"
            onChange={(e) => setFilaments(e.target.value)}
          />
        </label>
        <label>
          <span>Surface texture</span>
          <input
            className="a-photo-input"
            value={texture}
            placeholder="e.g. Carbon Fibre"
            onChange={(e) => setTexture(e.target.value)}
          />
        </label>
        {err && <p className="a-error">{err}</p>}
        <button className="a-mini a-photo-save" onClick={save} disabled={!dirty || saving}>
          {saving ? 'saving…' : saved ? 'saved ✓' : 'save details'}
        </button>
      </div>
    </figure>
  );
}
