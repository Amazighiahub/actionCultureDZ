// Notifications sur le téléphone. Ce fichier ne met rien en cache : le site reste toujours à jour.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let donnees = {};
  try {
    donnees = event.data ? event.data.json() : {};
  } catch {
    donnees = {};
  }
  event.waitUntil(self.registration.showNotification(donnees.titre || 'Tala DZ', {
    body: donnees.message || '',
    icon: '/icon-192.png',
    tag: donnees.tag,
    data: { url: donnees.url || '/notifications' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const cible = new URL(event.notification.data?.url || '/notifications', self.location.origin);
  // Jamais vers un autre site
  const adresse = cible.origin === self.location.origin ? cible.href : self.location.origin;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenetres) => {
    const ouverte = fenetres.find((f) => f.url.startsWith(self.location.origin));
    if (ouverte) {
      return ouverte.focus()
        .then((f) => (f && f.navigate ? f.navigate(adresse) : self.clients.openWindow(adresse)))
        .catch(() => self.clients.openWindow(adresse));
    }
    return self.clients.openWindow(adresse);
  }));
});
