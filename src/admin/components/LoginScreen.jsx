import { useState } from 'react';
import { login, oauthLogin, AuthError, MissingIdentityError } from '@netlify/identity';

// Google OAuth or email/password sign-in for the control panel. Access is
// checked separately against the server allowlist once a session exists.
export function LoginScreen({ onAuthed, error }) {
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
