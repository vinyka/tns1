/**
 * Service Worker customizado para notificações e atualizações
 */

importScripts("https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js");

console.log('[SW] Service Worker carregado');

self.addEventListener('install', (event) => {
  console.log('[SW] Evento: install');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Evento: activate');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Limpar caches antigos
      caches.keys().then(keys => {
        return Promise.all(
          keys.map(key => {
            if (key.includes('precache')) {
              console.log('[SW] Deletando cache antigo:', key);
              return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});

// Estratégia NetworkFirst para navegação
workbox.routing.registerRoute(
  ({request}) => request.mode === 'navigate',
  new workbox.strategies.NetworkFirst({
    cacheName: 'html-cache',
  })
);

// Interceptar requisições de navegação
self.addEventListener('fetch', (event) => {
  console.log('[SW] Evento: fetch', event.request.url, event.request.mode);
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          console.log('[SW] fetch do servidor bem-sucedido:', event.request.url, response.status);
          if (response && response.status === 200) {
            return response;
          }
          console.log('[SW] fetch do servidor falhou, tentando cache:', event.request.url);
          return caches.match(event.request);
        })
        .catch((err) => {
          console.log('[SW] fetch do servidor falhou totalmente, tentando cache:', event.request.url, err);
          return caches.match(event.request);
        })
    );
    return;
  }
});
