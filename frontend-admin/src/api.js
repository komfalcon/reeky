const API = import.meta.env.VITE_API_URL || 'https://reeky-core-api.vercel.app';
const ENGINE = import.meta.env.VITE_ENGINE_URL || 'https://reeky-backend-engine.onrender.com';

async function request(base, path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
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
  getTaskStatus: (taskId) => request(ENGINE, `/status/${taskId}`),
};
