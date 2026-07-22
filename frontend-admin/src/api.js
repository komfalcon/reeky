const API = import.meta.env.VITE_API_URL || 'https://reeky-core-api.vercel.app';

function getAdminKey() {
  return localStorage.getItem('admin_api_key') || '';
}

async function request(base, path, options = {}) {
  const adminKey = getAdminKey();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (adminKey) headers['x-admin-key'] = adminKey;

  const res = await fetch(`${base}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) {
      // Key may have been revoked — clear and redirect to login
      localStorage.removeItem('admin_api_key');
      window.location.reload();
      throw new Error(
        err.error || 'Unauthorized admin access — redirecting to login'
      );
    }
    throw new Error(err.error || err.message || `Request failed (${res.status})`);
  }
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  getQueue: () => request(API, '/api/admin/queue'),
  getCompletedQueue: () => request(API, '/api/admin/queue/completed'),
  submitAssets: (payload) =>
    request(API, '/api/admin/submit-assets', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  completeAsset: (assetId, assets) =>
    request(API, '/api/assets/webhook/complete', {
      method: 'POST',
      body: JSON.stringify({ assetId, assets }),
    }),
  getTaskStatus: (taskId, assetId) => {
    const q = assetId ? `?assetId=${encodeURIComponent(assetId)}` : '';
    return request(API, `/api/admin/task-status/${taskId}${q}`);
  },
  scrapeNotebooklm: (notebookUrl) =>
    request(API, '/api/admin/scrape-notebooklm', {
      method: 'POST',
      body: JSON.stringify({ notebook_url: notebookUrl }),
    }),
};
