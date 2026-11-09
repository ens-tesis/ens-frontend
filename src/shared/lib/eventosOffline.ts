// Eventos de foco del alumno sin conexión (anteproyecto, Anexo D.3): la
// cola vive en IndexedDB dentro del Service Worker (public/sw.js), que
// los manda en lote al volver la red — vía Background Sync donde existe
// (Chrome/Android), o cuando la página le avisa que reconectó.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
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
  void swActivo().then((reg) => {
    if (!reg) return;
    reg.active!.postMessage({
      type: "encolar",
      evento: { api: API_URL, codigo, token, estado, tsClient: new Date().toISOString() },
    });
    // Background Sync no está en los tipos de TS (no es estándar en todos
    // los navegadores): se usa si está.
    const sync = (reg as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } }).sync;
    sync?.register(TAG_SYNC).catch(() => {});
  });
}

export function sincronizarEventosOffline(): void {
  void swActivo().then((reg) => reg?.active!.postMessage({ type: "sincronizar" }));
}
