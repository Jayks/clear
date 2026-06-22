self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    // Network-first; falls back to "/" if the exact page fails (e.g. a
    // transient blip), then to a static inline page if even "/" fails (truly
    // offline — there's no cache here, so "/" still needs network too). The
    // inner .catch() matters: without it, a double failure rejects
    // unhandled — "Uncaught (in promise) TypeError: Failed to fetch" — and
    // the browser falls back to its own generic offline page instead of ours.
    event.respondWith(
      fetch(event.request).catch(() =>
        fetch("/").catch(
          () =>
            new Response(
              `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
                <title>Offline</title></head>
                <body style="font-family:system-ui,sans-serif;text-align:center;padding:4rem 1.5rem;color:#475569">
                  <p style="font-size:1.1rem;margin-bottom:0.5rem">You're offline</p>
                  <p style="color:#94a3b8;font-size:0.9rem">Check your connection and try again.</p>
                </body></html>`,
              { status: 200, headers: { "Content-Type": "text/html" } }
            )
        )
      )
    );
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
