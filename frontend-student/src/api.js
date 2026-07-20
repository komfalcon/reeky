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
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed (${res.status})`);
  }

  return res.json();
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

  generateAssets: (title, originalFileUrl, token, customInstructions) =>
    request('/api/assets/generate', {
      method: 'POST',
      body: { title, originalFileUrl, customInstructions },
      token,
    }),

  getAssets: (token) =>
    request('/api/assets', { token }),

  savePreferences: (token, preferences) =>
    request('/api/user/preferences', {
      method: 'POST',
      body: preferences,
      token,
    }),

  getProfile: (token) =>
    request('/api/user/profile', { token }),
};
