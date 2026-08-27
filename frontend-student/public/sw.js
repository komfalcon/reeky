const CACHE_NAME = 'reeky-foundry-shell-v2';
const MEDIA_CACHE_NAME = 'reeky-foundry-media-v2';
const LEGACY_MEDIA_CACHE_NAME = 'reeky-foundry-media-v1';
const APP_SHELL = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest'];

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
  const cache = await caches.open(MEDIA_CACHE_NAME);
  const cacheKey = new Request(request.url, { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (!cached || cached.status !== 200 || cached.headers.get('content-range')) return null;

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

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== MEDIA_CACHE_NAME && key !== LEGACY_MEDIA_CACHE_NAME)
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

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(async () => (await safeCacheMatch(request)) || Response.error())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

/* v2: saved media is stored separately by the app; this worker only serves it offline. */
