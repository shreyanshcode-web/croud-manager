import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'smartvenue-google-user';

const decodeJwtPayload = (token) => {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = window.atob(normalized);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

export function useGoogleIdentity() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const [user, setUser] = useState(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [status, setStatus] = useState(clientId ? 'ready' : 'missing_client_id');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!clientId) return undefined;

    let cancelled = false;
    let timeoutId = 0;

    const initialize = () => {
      if (cancelled) return;
      const google = window.google;

      if (!google?.accounts?.id) {
        timeoutId = window.setTimeout(initialize, 150);
        return;
      }

      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          const payload = decodeJwtPayload(response.credential);
          if (!payload) {
            setError('Google token could not be decoded.');
            setStatus('error');
            return;
          }

          const nextUser = {
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            givenName: payload.given_name,
          };

          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
          setUser(nextUser);
          setError('');
          setStatus('authenticated');
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      setStatus((current) => (current === 'authenticated' ? current : 'ready'));
    };

    initialize();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [clientId]);

  const actions = useMemo(() => ({
    promptSignIn: () => {
      const google = window.google;
      if (!clientId) {
        setError('Missing VITE_GOOGLE_CLIENT_ID.');
        setStatus('missing_client_id');
        return;
      }

      if (!google?.accounts?.id) {
        setError('Google Identity Services is not ready yet.');
        setStatus('error');
        return;
      }

      setError('');
      google.accounts.id.prompt();
    },
    signOut: () => {
      const google = window.google;
      google?.accounts?.id?.disableAutoSelect?.();
      window.localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      setStatus(clientId ? 'ready' : 'missing_client_id');
    },
  }), [clientId]);

  return {
    user,
    status,
    error,
    clientIdConfigured: Boolean(clientId),
    ...actions,
  };
}
