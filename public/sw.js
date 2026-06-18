self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => fetch("/")));
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const { title, body, url } = event.data.json();
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/api/pwa-icon?size=192",
      badge: "/api/pwa-icon?size=192",
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus any existing app window and navigate it to the exact notification URL.
        // The old `client.url.includes(url)` was too loose — a tab open on a deeper
        // page (e.g. /groups/abc/expenses/thread) would be focused for a notification
        // targeting /groups/abc, silently landing the user in the wrong place.
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            return client.focus().then((focused) => {
              if (focused && "navigate" in focused) return focused.navigate(url);
            });
          }
        }
        return clients.openWindow(url);
      })
  );
});
