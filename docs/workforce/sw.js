// Service worker: lets Atlas Workforce open and run offline once installed.
// Network first (so updates arrive as soon as they're published), cache as the fallback.
const CACHE = 'workforce-v2';
const SHELL = [
  './', './index.html', './style.css', './data.js', './art.js', './engine.js', './game.js', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('workforce-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const network = fetch(req).then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    });
    const cached = await cache.match(req, { ignoreSearch: true });
    if (!cached) return network.catch(() => (req.mode === 'navigate' ? cache.match('./index.html') : Response.error()));
    // Prefer fresh files, but never leave a phone on a bad connection staring at a blank screen.
    return Promise.race([
      network.catch(() => cached),
      new Promise(resolve => setTimeout(() => resolve(cached), 3000)),
    ]);
  })());
});
