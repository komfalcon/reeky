const MEDIA_DB_NAME = 'reeky-foundry-media-v1';
const MEDIA_STORE_NAME = 'files';
export const MEDIA_CACHE_NAME = 'reeky-foundry-media-v3';
const LEGACY_MEDIA_CACHE_NAMES = ['reeky-foundry-media-v2', 'reeky-foundry-media-v1'];

function openMediaDatabase() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB unavailable'));

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(MEDIA_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(MEDIA_STORE_NAME)) {
        request.result.createObjectStore(MEDIA_STORE_NAME, { keyPath: 'url' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB could not be opened'));
  });
}

function isCompleteResponse(response) {
  if (!response) return false;
  return (response.status === 200 || response.type === 'opaque') && !response.headers.get('content-range');
}

async function readFromIndexedDb(url) {
  const database = await openMediaDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(MEDIA_STORE_NAME, 'readonly');
    const request = transaction.objectStore(MEDIA_STORE_NAME).get(url);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Media read failed'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => database.close();
  });
}

async function writeToIndexedDb(url, blob) {
  const database = await openMediaDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(MEDIA_STORE_NAME, 'readwrite');
    transaction.objectStore(MEDIA_STORE_NAME).put({
      url,
      blob,
      size: blob.size,
      type: blob.type || 'application/octet-stream',
      savedAt: new Date().toISOString(),
    });
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('Media write failed'));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error('Media write aborted'));
    };
  });
}

async function removeFromIndexedDb(url) {
  const database = await openMediaDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(MEDIA_STORE_NAME, 'readwrite');
    transaction.objectStore(MEDIA_STORE_NAME).delete(url);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('Media delete failed'));
    };
  });
}

async function readFromCacheStorage(url) {
  if (!('caches' in window)) return null;

  for (const cacheName of [MEDIA_CACHE_NAME, ...LEGACY_MEDIA_CACHE_NAMES]) {
    try {
      const cache = await window.caches.open(cacheName);
      const response = await cache.match(url);
      if (!isCompleteResponse(response)) {
        if (response) await cache.delete(url).catch(() => {});
        continue;
      }

      const blob = await response.blob();
      if (!blob.size) continue;

      // Migrate a valid Cache Storage file into IndexedDB so future reads do not
      // depend on the browser's cross-origin Cache Storage behavior.
      try {
        await writeToIndexedDb(url, blob);
      } catch {
        // Cache Storage remains a valid fallback if IndexedDB is unavailable.
      }
      return { blob, size: blob.size, source: 'cache-storage' };
    } catch {
      // Try the next storage layer/cache namespace.
    }
  }

  return null;
}

export async function getOfflineMedia(url) {
  if (!url) return null;

  try {
    const record = await readFromIndexedDb(url);
    if (record?.blob?.size) return { blob: record.blob, size: record.size || record.blob.size, source: 'indexed-db' };
  } catch {
    // Fall through to Cache Storage.
  }

  return readFromCacheStorage(url);
}

export async function saveOfflineMedia(url, blob) {
  if (!url || !blob?.size) throw new Error('No complete media body to save');

  let saved = false;
  let indexedDbError;
  try {
    await writeToIndexedDb(url, blob);
    saved = true;
  } catch (error) {
    indexedDbError = error;
  }

  if ('caches' in window) {
    try {
      const cache = await window.caches.open(MEDIA_CACHE_NAME);
      const headers = new Headers({
        'Content-Type': blob.type || 'application/octet-stream',
        'Content-Length': String(blob.size),
        'Accept-Ranges': 'bytes',
      });
      await cache.put(new Request(url, { method: 'GET' }), new Response(blob, { status: 200, headers }));
      saved = true;
    } catch {
      // IndexedDB may still have saved the media successfully.
    }
  }

  if (!saved) throw indexedDbError || new Error('Offline storage is unavailable');
  return { size: blob.size };
}

export async function removeOfflineMedia(url) {
  if (!url) return;
  try {
    await removeFromIndexedDb(url);
  } catch {
    // Cache cleanup below can still succeed.
  }

  if ('caches' in window) {
    for (const cacheName of [MEDIA_CACHE_NAME, ...LEGACY_MEDIA_CACHE_NAMES]) {
      try {
        const cache = await window.caches.open(cacheName);
        await cache.delete(url);
      } catch {
        // Storage may be blocked; leave the app usable.
      }
    }
  }
}
