const CORE_CACHE = 'tienlen-genshin-core-v190';
const MEDIA_CACHE = 'tienlen-genshin-media-v1';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CORE_CACHE).then((cache) => {
      return Promise.allSettled(
        CORE_ASSETS.map((url) =>
          fetch(url, { cache: 'no-store' }).then((res) => {
            if (res && res.ok && res.status === 200) {
              return cache.put(url.replace(/\?.*$/, ''), res);
            }
          })
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CORE_CACHE && key !== MEDIA_CACHE) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

function isMediaFile(pathname) {
  return /\.(mp4|webm|ogg|mp3|wav|jpg|jpeg|png|webp|gif|svg)$/i.test(pathname);
}

async function createRangeResponse(request, cachedResponse) {
  if (!cachedResponse) return null;
  const rangeHeader = request.headers.get('range');
  if (!rangeHeader) return cachedResponse;

  try {
    const arrayBuffer = await cachedResponse.arrayBuffer();
    const bytes = /^bytes\=(\d+)\-(\d+)?$/i.exec(rangeHeader);
    if (!bytes) return cachedResponse;

    const start = Number(bytes[1]);
    const end = bytes[2] ? Number(bytes[2]) : arrayBuffer.byteLength - 1;
    const sliced = arrayBuffer.slice(start, end + 1);

    const headers = new Headers(cachedResponse.headers);
    headers.set('Content-Range', `bytes ${start}-${end}/${arrayBuffer.byteLength}`);
    headers.set('Content-Length', String(sliced.byteLength));
    headers.set('Accept-Ranges', 'bytes');

    return new Response(sliced, {
      status: 206,
      statusText: 'Partial Content',
      headers
    });
  } catch (_) {
    return cachedResponse;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 1. Media files (MP4, WebM, OGG, MP3, PNG, JPG): Cache-First for 0ms zero-lag playback
  if (isMediaFile(url.pathname)) {
    const cleanUrl = url.origin + url.pathname;
    event.respondWith(
      (async () => {
        const mediaCache = await caches.open(MEDIA_CACHE);
        let cached = await mediaCache.match(cleanUrl);
        if (!cached) {
          const coreCache = await caches.open(CORE_CACHE);
          cached = await coreCache.match(cleanUrl);
        }
        if (cached) {
          return createRangeResponse(req, cached);
        }

        try {
          const fetchReq = new Request(cleanUrl, { method: 'GET' });
          const netRes = await fetch(fetchReq);
          if (netRes && netRes.ok && netRes.status === 200) {
            mediaCache.put(cleanUrl, netRes.clone()).catch(() => {});
            return createRangeResponse(req, netRes);
          }
          return netRes;
        } catch (_) {
          return fetch(req);
        }
      })()
    );
    return;
  }

  // 2. HTML / JS / CSS / JSON: Always bypass browser HTTP cache (no-store) so new updates apply immediately on mobile!
  event.respondWith(
    fetch(req, { cache: 'no-store' })
      .then((netRes) => {
        if (netRes && netRes.ok && resIsCachable(netRes)) {
          const copy = netRes.clone();
          caches.open(CORE_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return netRes;
      })
      .catch(async () => {
        const cached = await caches.match(req, { ignoreSearch: true });
        return cached || caches.match('./index.html', { ignoreSearch: true });
      })
  );
});

function resIsCachable(res) {
  return res && res.status === 200 && res.type === 'basic';
}
