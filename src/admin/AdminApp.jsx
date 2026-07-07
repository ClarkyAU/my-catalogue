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
        <h1 className="a-logo">PRINTHOUSE<span>_ADMIN</span></h1>
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
        <span className="a-brand">PRINTHOUSE<span>_ADMIN</span></span>
        <div className="a-topbar-right">
          <a className="a-link" href="/" target="_blank" rel="noreferrer">view site ↗</a>
          <span className="a-muted a-hide-sm">{user.email}</span>
          <button className="a-btn a-btn-sm" onClick={onSignOut}>SIGN OUT</button>
        </div>
      </header>

      <main className="a-main">
        {error && <p className="a-error">{error}</p>}

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
      </main>
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
          <figure key={photo.id} className={`a-photo ${photo.isDefault ? 'is-default' : ''}`}>
            <img src={photo.url} alt="" />
            <figcaption>
              {photo.isDefault ? (
                <span className="a-default-tag">★ DEFAULT</span>
              ) : (
                <button className="a-mini" onClick={() => setDefault(photo.id)}>set default</button>
              )}
              <button className="a-mini a-mini-danger" onClick={() => remove(photo.id)}>delete</button>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
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
