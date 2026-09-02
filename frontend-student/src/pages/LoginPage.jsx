import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import FoundryLogo from '../components/FoundryLogo.jsx';

export default function LoginPage() {
  const { login, loginWithGoogle, resumeOfflineSession, hasOfflineSession } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const openCachedWorkspace = () => {
    if (resumeOfflineSession()) {
      navigate('/dashboard');
      return true;
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (isOffline) {
      if (!openCachedWorkspace()) setError('You are offline. Sign in once while online on this iPhone, then you can reopen your saved kits without a connection.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      if (!navigator.onLine && openCachedWorkspace()) return;
      setError(err?.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-brand" aria-label="Reeky Foundry home">
          <FoundryLogo />
        </Link>

        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          Welcome Back
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Log in to access your study materials.
        </p>

        {isOffline && (
          <div className="foundry-login-offline-note" role="status">
            <strong>{hasOfflineSession ? 'Saved session found on this iPhone' : 'You are offline'}</strong>
            <span>{hasOfflineSession ? 'You can continue to your cached learning workspace without signing in again.' : 'Online sign-in is required once on this device before offline access can be used.'}</span>
          </div>
        )}

        {isOffline && hasOfflineSession && (
          <button type="button" className="btn btn-primary foundry-offline-entry" onClick={openCachedWorkspace}>
            Continue to saved workspace
          </button>
        )}

        <form onSubmit={handleSubmit} autoComplete="on" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
              Email Address
            </label>
            <input
              className="auth-input"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="student@university.edu"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
              Password
            </label>
            <input
              className="auth-input"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,95,86,0.1)', border: '1px solid rgba(255,95,86,0.3)', borderRadius: '12px', fontSize: '0.85rem', color: '#ff5f56', fontWeight: 600 }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--divider)' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--divider)' }} />
        </div>

        <GoogleSignInButton
          disabled={isOffline || loading}
          onCredential={async credential => {
            setError('');
            setLoading(true);
            try {
              await loginWithGoogle(credential);
              navigate('/dashboard');
            } catch (err) {
              setError(err?.message || 'Unable to continue with Google. Please try again.');
            } finally {
              setLoading(false);
            }
          }}
        />

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 700 }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
