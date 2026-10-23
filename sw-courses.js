// Service Worker — Cache offline pour Courses Maison
// Version : incrémenter pour forcer la mise à jour du cache
const CACHE_NAME = 'maison-courses-v1';

// Fichiers à mettre en cache au premier chargement
const URLS_TO_CACHE = [
  'Courses_Maison.html',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js',
];

// Installation : mise en cache des ressources statiques
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // On met en cache ce qu'on peut (les URLs Firebase peuvent échouer en install)
      return Promise.allSettled(
        URLS_TO_CACHE.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

// Activation : supprime les anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch : stratégie "Network first, fallback cache"
// → On essaie le réseau en priorité, si pas de réseau on utilise le cache
self.addEventListener('fetch', event => {
  // On ne gère que les requêtes GET
  if (event.request.method !== 'GET') return;

  // Requêtes Firebase Realtime Database : laisser passer (Firebase gère lui-même le offline)
  if (event.request.url.includes('firebasedatabase.app')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Mettre à jour le cache avec la réponse fraîche
        if (response && response.status === 200 && response.type !== 'opaque') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        // Pas de réseau → on sert depuis le cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback ultime : page principale
          if (event.request.mode === 'navigate') {
            return caches.match('Courses_Maison.html');
          }
        });
      })
  );
});
