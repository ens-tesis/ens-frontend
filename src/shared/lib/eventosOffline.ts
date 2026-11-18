// Eventos de foco del alumno sin conexión (anteproyecto, Anexo D.3): la
// cola vive en IndexedDB dentro del Service Worker (public/sw.js), que
// los manda en lote al volver la red — vía Background Sync donde existe
// (Chrome/Android), o cuando la página le avisa que reconectó.

import { urlBackend } from "../api/backendUrl";
import { api } from "../api/client";
import { getToken } from "../auth/token";

const TAG_SYNC = "ens-eventos-offline";

async function swActivo(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg?.active ? reg : null;
}

export function encolarEventoOffline(
  codigo: string,
  estado: "conectado" | "fuera_de_foco",
  token: string,
): void {
  void Promise.all([swActivo(), urlBackend()]).then(([reg, api]) => {
    if (!reg) return;
    reg.active!.postMessage({
      type: "encolar",
      evento: { api, codigo, token, estado, tsClient: new Date().toISOString() },
    });
    // Background Sync no está en los tipos de TS (no es estándar en todos
    // los navegadores): se usa si está.
    const sync = (reg as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } }).sync;
    sync?.register(TAG_SYNC).catch(() => {});
  });
}

// Con un token vigente: la cola puede tener días y el guardado con cada
// evento ya venció. /auth/me pasa por el cliente Axios, que lo renueva si
// hace falta; sin red falla y no se manda nada (el SW reintenta solo).
export function sincronizarEventosOffline(): void {
  void swActivo().then(async (reg) => {
    if (!reg) return;
    const ok = await api.get("/auth/me").then(() => true, () => false);
    if (ok) reg.active!.postMessage({ type: "sincronizar", token: getToken() });
  });
}
