import { api } from "../api/client";

// Web Push (VAPID): con el permiso de notificaciones dado, este navegador
// se suscribe y el backend le manda cada alerta aunque la app esté
// cerrada (las muestra public/sw.js). En iPhone solo funciona con la app
// instalada en la pantalla de inicio (iOS 16.4+).

function soportado(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && typeof Notification !== "undefined";
}

// La clave pública VAPID viaja en base64url; pushManager la quiere en bytes.
function aBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(base64url.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

export async function suscribirPush(): Promise<void> {
  if (!soportado() || Notification.permission !== "granted") return;
  const { data } = await api.get<{ clave: string | null }>("/notificaciones/push/clave");
  if (!data.clave) return; // el servidor no tiene push configurado
  const reg = await navigator.serviceWorker.ready;
  const suscripcion =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(data.clave) }));
  await api.post("/notificaciones/push/suscripcion", suscripcion.toJSON());
}

// Al cerrar sesión (con el token todavía válido): este dispositivo deja de
// recibir las alertas de esa cuenta.
export async function desuscribirPush(): Promise<void> {
  if (!soportado()) return;
  const suscripcion = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
  if (!suscripcion) return;
  await api.delete("/notificaciones/push/suscripcion", { data: { endpoint: suscripcion.endpoint } }).catch(() => {});
  await suscripcion.unsubscribe();
}
