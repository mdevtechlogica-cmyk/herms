/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js");

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

fetch("/firebase-config.json")
  .then((response) => response.json())
  .then((config) => {
    if (!config?.apiKey || !config?.projectId) return;
    firebase.initializeApp(config);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title ?? "HERMS";
      const body = payload.notification?.body ?? "";
      self.registration.showNotification(title, {
        body,
        icon: "/images/techlogica-logo.png",
        data: payload.data ?? {},
      });
    });
  })
  .catch((error) => {
    console.warn("[firebase-messaging-sw] init failed", error);
  });

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification?.data?.path ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(path);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(path);
      }
    }),
  );
});
