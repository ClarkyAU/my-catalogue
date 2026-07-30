import { useCallback, useEffect, useState } from 'react';
import {
  getUser,
  logout,
  handleAuthCallback,
  MissingIdentityError,
} from '@netlify/identity';
import { api } from './api.js';
import { Splash } from './components/Splash.jsx';
import { LoginScreen } from './components/LoginScreen.jsx';
import { Dashboard } from './components/Dashboard.jsx';

// The admin shell: resolve who is signed in, confirm they are on the allowlist,
// and hand over to the dashboard. Everything else lives in ./components.
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
