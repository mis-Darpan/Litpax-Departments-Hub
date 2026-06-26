// Litpax Hub — Service Worker
const CACHE = 'litpax-hub-v1';
const STATIC = [
  '/Litpax-Departments-Hub/',
  '/Litpax-Departments-Hub/index.html',
  '/Litpax-Departments-Hub/admin.html',
  '/Litpax-Departments-Hub/css/style.css',
  '/Litpax-Departments-Hub/css/admin.css',
  '/Litpax-Departments-Hub/js/config.js',
  '/Litpax-Departments-Hub/js/app.js',
  '/Litpax-Departments-Hub/js/admin.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // GAS API — always network (fresh data)
  if (e.request.url.includes('script.google.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }
  // Static files — cache first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
