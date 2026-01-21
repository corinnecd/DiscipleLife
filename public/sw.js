// Service Worker pour les notifications push
// Ce fichier doit être dans le dossier public pour être accessible

const CACHE_NAME = 'disciple-life-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.jsx'
];

// Installation du service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache ouvert');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Suppression de l\'ancien cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
  console.log('Service Worker: Notification push reçue', event);
  
  let notificationData = {
    title: 'DiscipleLife',
    body: 'Vous avez une nouvelle notification',
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: 'disciple-life-notification',
    requireInteraction: false,
    data: {}
  };

  // Si des données sont envoyées avec la notification
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        requireInteraction: data.requireInteraction || false,
        data: data.data || {},
        actions: data.actions || []
      };
    } catch (e) {
      // Si ce n'est pas du JSON, utiliser le texte brut
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      actions: notificationData.actions,
      vibrate: [200, 100, 200],
      timestamp: Date.now()
    })
  );
});

// Gestion du clic sur la notification
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification cliquée', event);
  
  event.notification.close();

  // Récupérer l'URL de redirection depuis les données de la notification
  const redirectUrl = event.notification.data?.redirect_to || '/';
  const fullUrl = new URL(redirectUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si une fenêtre est déjà ouverte, la focus
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === fullUrl && 'focus' in client) {
            return client.focus();
          }
        }
        // Sinon, ouvrir une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      })
  );
});

// Gestion des actions de notification
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notification fermée', event);
});
