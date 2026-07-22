import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

// Google ID Token flow:
// Load Google Identity Services, then call handleGoogleLogin(response.credential.idToken)

export default function SignupPage() {
  const { signup, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async (idToken) => {
    setError('');
    setGoogleLoading(true);
    try {
      await googleLogin(idToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    const initGoogle = () => {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({
          client_id: '294632431205-sdtp5euhvbb7q3ui4kbqnc422db9u07n.apps.googleusercontent.com',
          callback: (response) => {
            if (response.credential) {
              handleGoogleLogin(response.credential);
            }
          },
        });
        const parent = document.getElementById('google-signin-btn');
        if (parent) {
          window.google.accounts.id.renderButton(parent, {
            type: 'standard',
            shape: 'rectangular',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            width: parent.offsetWidth || 350,
          });
        }
      }
    };

    initGoogle();
    
    const interval = setInterval(() => {
      if (window.google) {
        initGoogle();
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="logo" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
            <defs>
              <linearGradient id="logo-grad-s" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="var(--secondary)" />
              </linearGradient>
            </defs>
            <path d="M12 2L2 22H22L12 2Z" stroke="url(#logo-grad-s)" fill="none" />
            <path d="M20 12L15 22H29L20 12Z" stroke="url(#logo-grad-s)" fill="none" />
          </svg>
          Reeky Academic Hub
        </Link>

        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          Create Account
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Start turning your PDFs into interactive study materials.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
              Full Name
            </label>
            <input
              className="auth-input"
              type="text"
              placeholder="e.g. Jane Doe"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
              Email Address
            </label>
            <input
              className="auth-input"
              type="email"
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
              placeholder="Min. 8 characters with uppercase & number"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$"
              title="Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number"
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Must be 8+ characters with at least one uppercase letter, one lowercase letter, and one number
            </p>
          </div>

          {error && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,95,86,0.1)', border: '1px solid rgba(255,95,86,0.3)', borderRadius: '12px', fontSize: '0.85rem', color: '#ff5f56', fontWeight: 600 }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <div style={{ position: 'relative', width: '100%', height: '42px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', height: '100%', justifyContent: 'center', pointerEvents: 'none' }}
            >
              {googleLoading ? 'Signing in with Google...' : 'Continue with Google'}
            </button>
            <div
              id="google-signin-btn"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                overflow: 'hidden',
                cursor: 'pointer',
              }}
            />
          </div>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}