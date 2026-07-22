const BASE_URL = import.meta.env.VITE_API_URL || 'https://reeky-core-api.vercel.app';

async function request(endpoint, options = {}) {
  const { body, method = 'GET', token } = options;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      err.error ||
      err.message ||
      (res.status === 401
        ? 'Authentication required'
        : res.status === 403
          ? 'Invalid or expired session'
          : res.statusText || `Request failed (${res.status})`);
    throw new Error(message);
  }

  // Some endpoints may return an empty body
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  health: () => request('/api/health'),

  signup: (name, email, password) =>
    request('/api/auth/signup', {
      method: 'POST',
      body: { name, email, password },
    }),

  login: (email, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  generateAssets: (title, originalFileUrl, token, customInstructions, assetsRequested) =>
    request('/api/assets/generate', {
      method: 'POST',
      body: { title, originalFileUrl, customInstructions, assetsRequested },
      token,
    }),

  getAssets: async (token) => {
    const data = await request('/api/assets', { token });
    return Array.isArray(data) ? data : [];
  },

  savePreferences: (token, preferences) =>
    request('/api/user/preferences', {
      method: 'POST',
      body: preferences,
      token,
    }),

  getProfile: (token) =>
    request('/api/user/profile', { token }),

  googleLogin: (accessToken) =>
    request('/api/auth/google', {
      method: 'POST',
      body: { accessToken },
    }),
};
