import React, { useState } from 'react';
import { Layers, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage({ onAuthenticated }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('admin_api_key') || '');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!apiKey.trim()) {
      setError('Please enter your admin API key');
      return;
    }

    setLoading(true);

    try {
      // Test the API key by making a request to the admin queue
      const API = import.meta.env.VITE_API_URL || 'https://reeky-core-api.vercel.app';
      const res = await fetch(`${API}/api/admin/queue`, {
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': apiKey.trim(),
        },
      });

      if (res.status === 401) {
        setError('Invalid admin API key. Please check and try again.');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(`Server error (${res.status}). Please try again.`);
        setLoading(false);
        return;
      }

      // Key is valid — store it
      localStorage.setItem('admin_api_key', apiKey.trim());
      onAuthenticated(apiKey.trim());
    } catch (err) {
      setError('Failed to connect to server. Check your network connection.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg)',
      padding: '1rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2.5rem',
        borderRadius: '16px',
        background: 'var(--card-bg)',
        border: '1px solid var(--divider)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <Layers size={24} color="white" />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.5rem',
            fontWeight: 800,
            marginBottom: '0.25rem',
          }}>
            Reeky Admin
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Enter your admin API key to continue
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
              color: 'var(--text)',
            }}>
              Admin API Key
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key..."
                style={{
                  width: '100%',
                  padding: '0.75rem 2.5rem 0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--divider)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '4px',
                }}
              >
                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'rgba(239,68,68,0.1)',
              color: '#ef4444',
              fontSize: '0.85rem',
              marginBottom: '1rem',
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: 'none',
              background: loading ? 'var(--primary-muted)' : 'var(--primary)',
              color: 'white',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Verifying...' : 'Sign In'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
        }}>
          Your API key is stored locally and never sent to third parties.
        </p>
      </div>
    </div>
  );
}