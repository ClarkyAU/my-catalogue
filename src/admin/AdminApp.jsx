import React, { useEffect, useState, useCallback } from 'react';
import {
  getUser,
  login,
  oauthLogin,
  logout,
  handleAuthCallback,
  AuthError,
  MissingIdentityError,
} from '@netlify/identity';
import { api } from './api.js';
import { fileToUpload } from './image.js';

export function AdminApp() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState('unknown'); // 'unknown' | 'granted' | 'denied'
  const [authError, setAuthError] = useState('');

  const checkAccess = useCallback(async () => {
    try {
      await api('/session');
      setAccess('granted');
    } catch (err) {
      setAccess(err.status === 403 ? 'denied' : 'unknown');
      setAuthError(err.message || '');
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await handleAuthCallback();
      } catch {
        /* no callback in URL */
      }
      try {
        const current = await getUser();
        setUser(current);
        if (current) await checkAccess();
      } catch (err) {
        if (err instanceof MissingIdentityError) {
          setAuthError('Netlify Identity is not enabled on this site yet.');
        }
      } finally {
        setBooting(false);
      }
    })();
  }, [checkAccess]);

  const signOut = async () => {
    try {
      await logout();
    } catch {
      /* ignore */
    }
    setUser(null);
    setAccess('unknown');
  };

  if (booting) return <Splash text="INITIALISING..." />;

  if (!user) {
    return <LoginScreen error={authError} onAuthed={async (u) => { setUser(u); await checkAccess(); }} />;
  }

  if (access === 'denied') {
    return (
      <Splash>
        <p className="a-lead">ACCESS DENIED</p>
        <p className="a-muted">{authError || `${user.email} is not authorized.`}</p>
        <button className="a-btn" onClick={signOut}>SIGN OUT</button>
      </Splash>
    );
  }

  if (access !== 'granted') {
    return (
      <Splash>
        <p className="a-lead">COULD NOT VERIFY ACCESS</p>
        {authError && <p className="a-muted">{authError}</p>}
        <button className="a-btn" onClick={signOut}>SIGN OUT</button>
      </Splash>
    );
  }

  return <Dashboard user={user} onSignOut={signOut} />;
}

/* ------------------------------- Login ------------------------------- */

function LoginScreen({ onAuthed, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(error || '');
  const [busy, setBusy] = useState(false);

  const google = () => {
    // Redirects away; returns via handleAuthCallback() on the next load.
    oauthLogin('google');
  };

  const emailLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const u = await login(email, password);
      await onAuthed(u);
    } catch (err) {
      if (err instanceof MissingIdentityError) {
        setMsg('Identity is not enabled. Run via `netlify dev` locally or enable it in Netlify.');
      } else if (err instanceof AuthError) {
        setMsg(err.status === 401 ? 'Invalid email or password.' : err.message);
      } else {
        setMsg(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="a-login-wrap">
      <div className="a-login-card">
        <h1 className="a-logo">CLARKY3D<span>_ADMIN</span></h1>
        <p className="a-muted">Restricted control panel</p>

        <button className="a-btn a-btn-google" onClick={google}>
          Sign in with Google
        </button>

        <div className="a-divider"><span>or</span></div>

        <form onSubmit={emailLogin} className="a-form">
          <input className="a-input" type="email" placeholder="email" value={email}
            onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          <input className="a-input" type="password" placeholder="password" value={password}
            onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          <button className="a-btn" type="submit" disabled={busy}>
            {busy ? '...' : 'SIGN IN'}
          </button>
        </form>

        {msg && <p className="a-error">{msg}</p>}
      </div>
    </div>
  );
}

/* ----------------------------- Dashboard ----------------------------- */

function Dashboard({ user, onSignOut }) {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newCat, setNewCat] = useState('');
  const [page, setPage] = useState('catalogue'); // 'catalogue' | 'filaments'

  const reload = useCallback(async () => {
    try {
      const data = await api('/catalogue');
      setTree(data.categories || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const addCategory = async (e) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    await api('/categories', { method: 'POST', body: { displayName: newCat.trim() } });
    setNewCat('');
    reload();
  };

  return (
    <div className="a-shell">
      <header className="a-topbar">
        <span className="a-brand">CLARKY3D<span>_ADMIN</span></span>
        <nav className="a-nav">
          <button
            className={`a-nav-btn ${page === 'catalogue' ? 'is-active' : ''}`}
            onClick={() => setPage('catalogue')}
          >
            CATALOGUE
          </button>
          <button
            className={`a-nav-btn ${page === 'filaments' ? 'is-active' : ''}`}
            onClick={() => setPage('filaments')}
          >
            FILAMENTS
          </button>
        </nav>
        <div className="a-topbar-right">
          <a className="a-link" href="/" target="_blank" rel="noreferrer">view site ↗</a>
          <span className="a-muted a-hide-sm">{user.email}</span>
          <button className="a-btn a-btn-sm" onClick={onSignOut}>SIGN OUT</button>
        </div>
      </header>

      <main className="a-main">
        {error && <p className="a-error">{error}</p>}

        {page === 'filaments' ? (
          <FilamentManager />
        ) : (
          <>
            <SiteSettings />

            <form className="a-addbar" onSubmit={addCategory}>
              <input className="a-input" placeholder="New category name…" value={newCat}
                onChange={(e) => setNewCat(e.target.value)} />
              <button className="a-btn" type="submit">+ CATEGORY</button>
            </form>

            {loading ? (
              <Splash text="LOADING…" inline />
            ) : tree.length === 0 ? (
              <p className="a-muted">No categories yet. Add one above to get started.</p>
            ) : (
              tree.map((cat) => <CategoryBlock key={cat.id} category={cat} reload={reload} />)
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* --------------------------- Site settings --------------------------- */

// The three lines of the landing-page welcome message. Editing these keeps the
// admin in sync with exactly what the storefront shows.
const SETTINGS_FIELDS = [
  { key: 'landingIntro', label: 'Intro message', rows: 3 },
  { key: 'landingSubtext', label: 'Highlighted line', rows: 2 },
  { key: 'landingNote', label: 'Footnote', rows: 2 },
];

function SiteSettings() {
  const [values, setValues] = useState({});
  const [original, setOriginal] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await api('/settings');
        const picked = {};
        for (const { key } of SETTINGS_FIELDS) picked[key] = data[key] || '';
        setValues(picked);
        setOriginal(picked);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const dirty = SETTINGS_FIELDS.some(({ key }) => values[key] !== original[key]);

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      const data = await api('/settings', { method: 'PATCH', body: values });
      const picked = {};
      for (const { key } of SETTINGS_FIELDS) picked[key] = data[key] ?? values[key];
      setOriginal(picked);
      setValues(picked);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="a-settings">
      <h2 className="a-settings-title">SITE TEXT</h2>
      <p className="a-settings-hint">The welcome message shown on the New Products home page. Leave a field empty to hide that line.</p>
      {SETTINGS_FIELDS.map(({ key, label, rows }) => (
        <label className="a-field" key={key}>
          <span>{label}</span>
          <textarea
            className="a-input a-textarea"
            rows={rows}
            value={values[key] || ''}
            disabled={loading}
            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
          />
        </label>
      ))}
      {err && <p className="a-error">{err}</p>}
      <div className="a-prod-actions">
        <button className="a-btn a-btn-sm" onClick={save} disabled={loading || !dirty || saving}>
          {saving ? 'SAVING…' : saved ? 'SAVED ✓' : 'SAVE TEXT'}
        </button>
      </div>
    </section>
  );
}

/* ------------------------ Filament management ------------------------ */

// The three stock states the storefront understands. Kept in sync with the
// server's FILAMENT_STATUSES; anything else is coerced back to "In Stock".
const FILAMENT_STATUSES = ['In Stock', 'Out of Stock', 'On Order'];

function FilamentManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // New-filament form state.
  const [name, setName] = useState('');
  const [material, setMaterial] = useState('');
  const [hex, setHex] = useState('#00e5ff');
  const [status, setStatus] = useState('In Stock');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api('/filaments');
      setItems(Array.isArray(data) ? data : []);
      setErr('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setErr('');
    try {
      await api('/filaments', {
        method: 'POST',
        body: { name: name.trim(), material: material.trim(), hex, status },
      });
      setName('');
      setMaterial('');
      setHex('#00e5ff');
      setStatus('In Stock');
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <section className="a-settings">
      <h2 className="a-settings-title">FILAMENT COLOURS</h2>
      <p className="a-settings-hint">
        Colours shown on the public Colours page. Supplier details are never stored or shown on the site.
      </p>

      <form className="a-fil-add" onSubmit={add}>
        <input className="a-input" placeholder="Colour name" value={name}
          onChange={(e) => setName(e.target.value)} />
        <input className="a-input" placeholder="Material (e.g. PLA)" value={material}
          onChange={(e) => setMaterial(e.target.value)} />
        <input className="a-color" type="color" value={hex}
          onChange={(e) => setHex(e.target.value)} title="Swatch colour" />
        <select className="a-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          {FILAMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="a-btn a-btn-sm" type="submit" disabled={adding || !name.trim()}>
          {adding ? 'ADDING…' : '+ ADD'}
        </button>
      </form>

      {err && <p className="a-error">{err}</p>}

      {loading ? (
        <p className="a-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="a-muted">No filaments yet. Add one above.</p>
      ) : (
        <div className="a-fil-list">
          {items.map((f) => <FilamentRow key={f.id} filament={f} reload={load} />)}
        </div>
      )}
    </section>
  );
}

function FilamentRow({ filament, reload }) {
  const [name, setName] = useState(filament.name);
  const [material, setMaterial] = useState(filament.material || '');
  const [hex, setHex] = useState(filament.hex || '#000000');
  const [status, setStatus] = useState(filament.status || 'In Stock');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty =
    name !== filament.name ||
    material !== (filament.material || '') ||
    hex !== filament.hex ||
    status !== filament.status;

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api(`/filaments/${filament.id}`, {
        method: 'PATCH',
        body: { name: name.trim(), material: material.trim(), hex, status },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      reload();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete filament "${filament.name}"?`)) return;
    await api(`/filaments/${filament.id}`, { method: 'DELETE' });
    reload();
  };

  return (
    <div className="a-fil-row">
      <span className="a-fil-swatch" style={{ background: hex }} />
      <input className="a-input a-fil-name" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="a-input a-fil-mat" value={material} placeholder="Material"
        onChange={(e) => setMaterial(e.target.value)} />
      <input className="a-color" type="color" value={hex}
        onChange={(e) => setHex(e.target.value)} title="Swatch colour" />
      <select className="a-input a-fil-status" value={status} onChange={(e) => setStatus(e.target.value)}>
        {FILAMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <button className="a-btn a-btn-sm" onClick={save} disabled={!dirty || saving}>
        {saving ? '…' : saved ? '✓' : 'SAVE'}
      </button>
      <button className="a-btn a-btn-sm a-danger" onClick={remove}>DEL</button>
    </div>
  );
}

/* --------------------------- Category block -------------------------- */
function CategoryBlock({ category, reload }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.displayName);
  const [color, setColor] = useState(category.themeColor || '#00E5FF');
  const [newSub, setNewSub] = useState('');
  const [open, setOpen] = useState(true);

  const save = async () => {
    await api(`/categories/${category.id}`, { method: 'PATCH', body: { displayName: name, themeColor: color } });
    setEditing(false);
    reload();
  };

  const remove = async () => {
    if (!confirm(`Delete category "${category.displayName}" and everything inside it?`)) return;
    await api(`/categories/${category.id}`, { method: 'DELETE' });
    reload();
  };

  const addSub = async (e) => {
    e.preventDefault();
    if (!newSub.trim()) return;
    await api('/subcategories', { method: 'POST', body: { categoryId: category.id, displayName: newSub.trim() } });
    setNewSub('');
    reload();
  };

  return (
    <section className="a-cat" style={{ '--cat-color': color }}>
      <div className="a-cat-head">
        <button className="a-collapse" onClick={() => setOpen(!open)}>{open ? '▾' : '▸'}</button>
        {editing ? (
          <div className="a-inline-edit">
            <input className="a-input" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="a-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            <button className="a-btn a-btn-sm" onClick={save}>SAVE</button>
            <button className="a-btn a-btn-sm a-ghost" onClick={() => setEditing(false)}>CANCEL</button>
          </div>
        ) : (
          <>
            <span className="a-swatch" style={{ background: color }} />
            <h2 className="a-cat-title">{category.displayName}</h2>
            <div className="a-spacer" />
            <button className="a-btn a-btn-sm a-ghost" onClick={() => setEditing(true)}>EDIT</button>
            <button className="a-btn a-btn-sm a-danger" onClick={remove}>DELETE</button>
          </>
        )}
      </div>

      {open && (
        <div className="a-cat-body">
          {category.subcategories.map((sub) => (
            <SubcategoryBlock key={sub.id} sub={sub} reload={reload} />
          ))}
          <form className="a-addbar a-addbar-sub" onSubmit={addSub}>
            <input className="a-input" placeholder="New subcategory name…" value={newSub}
              onChange={(e) => setNewSub(e.target.value)} />
            <button className="a-btn a-btn-sm" type="submit">+ SUBCATEGORY</button>
          </form>
        </div>
      )}
    </section>
  );
}

/* ------------------------- Subcategory block ------------------------- */

function SubcategoryBlock({ sub, reload }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(sub.displayName);
  const [adding, setAdding] = useState(false);
  const [newProd, setNewProd] = useState('');

  const save = async () => {
    await api(`/subcategories/${sub.id}`, { method: 'PATCH', body: { displayName: name } });
    setEditing(false);
    reload();
  };

  const remove = async () => {
    if (!confirm(`Delete subcategory "${sub.displayName}" and its products?`)) return;
    await api(`/subcategories/${sub.id}`, { method: 'DELETE' });
    reload();
  };

  const addProduct = async (e) => {
    e.preventDefault();
    if (!newProd.trim()) return;
    await api('/products', { method: 'POST', body: { subcategoryId: sub.id, displayName: newProd.trim() } });
    setNewProd('');
    setAdding(false);
    reload();
  };

  return (
    <div className="a-sub">
      <div className="a-sub-head">
        {editing ? (
          <div className="a-inline-edit">
            <input className="a-input" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="a-btn a-btn-sm" onClick={save}>SAVE</button>
            <button className="a-btn a-btn-sm a-ghost" onClick={() => setEditing(false)}>CANCEL</button>
          </div>
        ) : (
          <>
            <h3 className="a-sub-title">{sub.displayName}</h3>
            <span className="a-count">{sub.products.length} item{sub.products.length === 1 ? '' : 's'}</span>
            <div className="a-spacer" />
            <button className="a-btn a-btn-sm a-ghost" onClick={() => setEditing(true)}>EDIT</button>
            <button className="a-btn a-btn-sm a-danger" onClick={remove}>DELETE</button>
          </>
        )}
      </div>

      <div className="a-products">
        {sub.products.map((prod) => (
          <ProductBlock key={prod.id} product={prod} reload={reload} />
        ))}
      </div>

      {adding ? (
        <form className="a-addbar a-addbar-sub" onSubmit={addProduct}>
          <input className="a-input" placeholder="New product name…" value={newProd} autoFocus
            onChange={(e) => setNewProd(e.target.value)} />
          <button className="a-btn a-btn-sm" type="submit">CREATE</button>
          <button className="a-btn a-btn-sm a-ghost" type="button" onClick={() => setAdding(false)}>CANCEL</button>
        </form>
      ) : (
        <button className="a-btn a-btn-sm a-add-prod" onClick={() => setAdding(true)}>+ ADD PRODUCT</button>
      )}
    </div>
  );
}

/* ---------------------------- Product block -------------------------- */

function ProductBlock({ product, reload }) {
  const [name, setName] = useState(product.displayName);
  const [price, setPrice] = useState(product.price);
  const [featured, setFeatured] = useState(product.featured);
  const [description, setDescription] = useState(product.description || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty =
    name !== product.displayName ||
    price !== product.price ||
    featured !== product.featured ||
    description !== (product.description || '');

  const save = async () => {
    setSaving(true);
    try {
      await api(`/products/${product.id}`, {
        method: 'PATCH',
        body: { displayName: name, price, featured, description },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      reload();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete product "${product.displayName}"?`)) return;
    await api(`/products/${product.id}`, { method: 'DELETE' });
    reload();
  };

  return (
    <div className="a-prod">
      <div className="a-prod-fields">
        <label className="a-field">
          <span>Name</span>
          <input className="a-input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="a-field a-field-price">
          <span>Price ($)</span>
          <input className="a-input" type="number" step="0.01" min="0" value={price}
            onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label className="a-field a-field-featured">
          <span>Featured</span>
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
        </label>
      </div>

      <label className="a-field">
        <span>Description</span>
        <textarea className="a-input a-textarea" rows={5} value={description}
          onChange={(e) => setDescription(e.target.value)} />
      </label>

      <PhotoGrid product={product} reload={reload} />

      <div className="a-prod-actions">
        <button className="a-btn a-btn-sm" onClick={save} disabled={!dirty || saving}>
          {saving ? 'SAVING…' : saved ? 'SAVED ✓' : 'SAVE CHANGES'}
        </button>
        <div className="a-spacer" />
        <button className="a-btn a-btn-sm a-danger" onClick={remove}>DELETE PRODUCT</button>
      </div>
    </div>
  );
}

/* ----------------------------- Photo grid ---------------------------- */

function PhotoGrid({ product, reload }) {
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
          <PhotoCard
            key={photo.id}
            photo={photo}
            onSetDefault={setDefault}
            onRemove={remove}
            reload={reload}
          />
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- Photo card ---------------------------- */

// A single photo tile: preview, default/delete controls, plus the per-image
// print details (which filament(s) were used and any surface texture) that the
// storefront shows as a caption under the main image.
function PhotoCard({ photo, onSetDefault, onRemove, reload }) {
  const initialFilaments = (photo.filaments || []).join(', ');
  const initialTexture = photo.texture || '';
  const [filaments, setFilaments] = useState(initialFilaments);
  const [texture, setTexture] = useState(initialTexture);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = filaments !== initialFilaments || texture !== initialTexture;

  const save = async () => {
    setSaving(true);
    try {
      const list = filaments.split(',').map((s) => s.trim()).filter(Boolean);
      const cleanTexture = texture.trim();
      await api(`/photos/${photo.id}`, {
        method: 'PATCH',
        body: { filaments: list, texture: cleanTexture },
      });
      // Normalise the inputs to match what the server stored so the form
      // settles back to a clean (non-dirty) state after reload.
      setFilaments(list.join(', '));
      setTexture(cleanTexture);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      reload();
    } finally {
      setSaving(false);
    }
  };

  return (
    <figure className={`a-photo ${photo.isDefault ? 'is-default' : ''}`}>
      <img src={photo.url} alt="" />
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
        <button className="a-mini a-photo-save" onClick={save} disabled={!dirty || saving}>
          {saving ? 'saving…' : saved ? 'saved ✓' : 'save details'}
        </button>
      </div>
    </figure>
  );
}

/* ------------------------------- Splash ------------------------------ */

function Splash({ text, children, inline }) {
  return (
    <div className={inline ? 'a-splash-inline' : 'a-splash'}>
      {text ? <p className="a-lead">{text}</p> : children}
    </div>
  );
}
