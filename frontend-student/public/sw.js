const CACHE_NAME = 'reeky-foundry-shell-v5';
const LEGACY_SHELL_CACHE_NAMES = ['reeky-foundry-shell-v4', 'reeky-foundry-shell-v3', 'reeky-foundry-shell-v2', 'reeky-foundry-shell-v1'];
const MEDIA_CACHE_NAME = 'reeky-foundry-media-v3';
const LEGACY_MEDIA_CACHE_NAMES = ['reeky-foundry-media-v2', 'reeky-foundry-media-v1'];
const APP_SHELL = ['/', '/index.html', '/favicon.svg', '/apple-touch-icon.png', '/manifest.webmanifest'];
// Filled with the exact hashed build assets by vite.config.js after each build.
const PRECACHE_URLS = [];

const isMediaProxyRequest = request => {
  const url = new URL(request.url);
  return request.method === 'GET' && url.pathname.startsWith('/api/media/proxy/');
};

const safeCacheMatch = async request => {
  try {
    return await caches.match(request);
  } catch (error) {
    console.warn('Cache Storage read unavailable:', error);
    return null;
  }
};

const parseByteRange = (rangeHeader, totalSize) => {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(String(rangeHeader || '').trim());
  if (!match || !Number.isFinite(totalSize) || totalSize <= 0) return null;

  const [, startValue, endValue] = match;
  let start;
  let end;

  if (startValue === '') {
    const suffixLength = Number(endValue);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(totalSize - suffixLength, 0);
    end = totalSize - 1;
  } else {
    start = Number(startValue);
    end = endValue === '' ? totalSize - 1 : Number(endValue);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= totalSize || start > end) return null;
    end = Math.min(end, totalSize - 1);
  }

  return { start, end };
};

async function serveCachedMedia(request) {
  const cacheKey = new Request(request.url, { method: 'GET' });
  let cached = null;

  for (const cacheName of [MEDIA_CACHE_NAME, ...LEGACY_MEDIA_CACHE_NAMES]) {
    try {
      const cache = await caches.open(cacheName);
      cached = await cache.match(cacheKey);
      if (cached && cached.status === 200 && !cached.headers.get('content-range')) break;
      cached = null;
    } catch {
      // Continue to the next cache namespace if storage access is blocked.
    }
  }

  if (!cached) return null;

  const rangeHeader = request.headers.get('range');
  if (!rangeHeader) return cached;

  const bytes = await cached.clone().arrayBuffer();
  const range = parseByteRange(rangeHeader, bytes.byteLength);
  if (!range) {
    return new Response(null, {
      status: 416,
      statusText: 'Range Not Satisfiable',
      headers: { 'Content-Range': `bytes */${bytes.byteLength}` }
    });
  }

  const headers = new Headers();
  headers.set('Content-Type', cached.headers.get('content-type') || 'application/octet-stream');
  headers.set('Content-Length', String(range.end - range.start + 1));
  headers.set('Content-Range', `bytes ${range.start}-${range.end}/${bytes.byteLength}`);
  headers.set('Accept-Ranges', 'bytes');
  return new Response(bytes.slice(range.start, range.end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers
  });
}

async function handleMediaRequest(request) {
  try {
    const cached = await serveCachedMedia(request);
    if (cached) return cached;
  } catch (error) {
    console.warn('Cached media range handling failed:', error);
  }

  try {
    return await fetch(request);
  } catch (error) {
    const fallback = await safeCacheMatch(new Request(request.url, { method: 'GET' }));
    if (fallback) return fallback;
    // FetchEvent.respondWith must always receive a Response. Returning an
    // error response avoids the uncaught "Failed to convert value to Response"
    // error when the network and cache are both unavailable.
    return Response.error();
  }
}

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const urls = new Set([...APP_SHELL, ...PRECACHE_URLS]);

  try {
    const response = await fetch('/index.html', { cache: 'no-store' });
    if (response.ok) {
      const markup = await response.clone().text();
      for (const match of markup.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) {
        try {
          const assetUrl = new URL(match[1], self.location.origin);
          if (assetUrl.origin === self.location.origin) urls.add(assetUrl.pathname + assetUrl.search);
        } catch {
          // Ignore malformed or external document references.
        }
      }
      await cache.put('/index.html', response);
    }
  } catch {
    // An existing worker/cache can continue serving the previous shell.
  }

  await Promise.all([...urls].map(async url => {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) await cache.put(url, response);
    } catch {
      // A single optional asset must not abort Service Worker installation.
    }
  }));
}

self.addEventListener('install', event => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== MEDIA_CACHE_NAME && !LEGACY_SHELL_CACHE_NAMES.includes(key) && !LEGACY_MEDIA_CACHE_NAMES.includes(key))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // The dashboard uses this one-shot query flag to download a complete file
  // for offline storage without the Service Worker turning it into a range
  // response first. The normal media URL remains the cache key.
  if (url.searchParams.has('reeky-offline-save')) return;

  if (isMediaProxyRequest(request)) {
    event.respondWith(handleMediaRequest(request));
    return;
  }

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => (await safeCacheMatch('/index.html')) || Response.error())
    );
    return;
  }

  event.respondWith((async () => {
    const cached = await safeCacheMatch(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
      }
      return response;
    } catch {
      return Response.error();
    }
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

/* v3: saved media is stored in IndexedDB first and Cache Storage as a fallback. */
