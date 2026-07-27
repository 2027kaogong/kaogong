const CACHE_NAME = 'kaogong-v1';
const urlsToCache = [
  '/kaogong/',
  '/kaogong/index.html',
  '/kaogong/manifest.json',
  '/kaogong/css/style.css',
  '/kaogong/js/utils.js',
  '/kaogong/js/idioms-data.js',
  '/kaogong/js/sample-questions.js',
  '/kaogong/js/web-cache.js',
  '/kaogong/js/morning-data.js',
  '/kaogong/js/db.js',
  '/kaogong/js/pages/home.js',
  '/kaogong/js/pages/practice.js',
  '/kaogong/js/pages/error-book.js',
  '/kaogong/js/pages/plan.js',
  '/kaogong/js/pages/morning.js',
  '/kaogong/js/pages/statistics.js',
  '/kaogong/js/app.js',
  '/kaogong/icons/icon-192.svg',
  '/kaogong/icons/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
    ))
  );
});
