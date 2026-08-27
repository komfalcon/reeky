import { useEffect, useRef, useState } from 'react';
import { loadGoogleIdentityScript } from '../googleAuth';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function GoogleSignInButton({ onCredential, disabled = false }) {
  const buttonRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;
    if (!GOOGLE_CLIENT_ID || disabled || !buttonRef.current) return undefined;

    setLoading(true);
    loadGoogleIdentityScript()
      .then(google => {
        if (cancelled || !buttonRef.current) return;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: response => callbackRef.current(response.credential),
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: Math.min(buttonRef.current.clientWidth || 360, 400),
          logo_alignment: 'left',
        });
      })
      .catch(errorValue => {
        if (!cancelled) setError(errorValue?.message || 'Google sign-in is unavailable.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (buttonRef.current) buttonRef.current.replaceChildren();
    };
  }, [disabled]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="google-auth-unconfigured" role="status">
        Google sign-in is not configured for this deployment yet.
      </div>
    );
  }

  return (
    <div className="google-auth-control">
      <div ref={buttonRef} className="google-auth-button" aria-label="Continue with Google" />
      {loading && <span className="google-auth-status">Loading secure Google sign-in…</span>}
      {error && <span className="google-auth-status google-auth-error">{error}</span>}
    </div>
  );
}
