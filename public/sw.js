// Service Worker mínimo del ENS: hace falta para mostrar notificaciones
// del sistema (en Android, `new Notification()` no está permitido; solo
// `registration.showNotification`). Las notificaciones las dispara la app
// abierta al recibirlas por WebSocket (ver useNotificaciones.ts) — no hay
// Web Push con la app cerrada (eso requiere suscripción VAPID en el
// backend, fuera del alcance de esta etapa).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Al tocar la notificación: enfoca una pestaña/ventana del ENS ya abierta
// o abre la ruta indicada.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => new URL(v.url).origin === self.location.origin);
      return abierta ? abierta.focus() : self.clients.openWindow(url);
    }),
  );
});
