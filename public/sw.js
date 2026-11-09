// Service Worker del ENS:
// - Notificaciones del sistema (en Android, `new Notification()` no está
//   permitido; solo `registration.showNotification`). Las dispara la app
//   abierta al recibirlas por WebSocket (ver useNotificaciones.ts) — no hay
//   Web Push con la app cerrada (requiere VAPID, fuera de esta etapa).
// - Caché offline de la app (anteproyecto §3.2): si el wifi del colegio se
//   cae y el alumno recarga, la PWA abre igual (con la última whitelist que
//   guarda useSesionSocket) en vez de la página de error del navegador.
//   Solo mismo origen: la API y el WebSocket del backend no pasan por acá.

const CACHE = "ens-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  ),
);

async function guardar(request, response) {
  // Solo respuestas buenas: no cachear un 403 del checkpoint de Vercel ni errores.
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

// Red primero (siempre lo último publicado); sin red, lo último guardado.
async function redPrimero(request) {
  try {
    return await guardar(request, await fetch(request));
  } catch (err) {
    // Las páginas se buscan sin query (?codigo=... del QR).
    const guardada = await caches.match(request, { ignoreSearch: request.mode === "navigate" });
    if (guardada) return guardada;
    throw err;
  }
}

// /_next/static lleva hash en el nombre: nunca cambia, así que caché primero.
async function cachePrimero(request) {
  return (await caches.match(request)) ?? guardar(request, await fetch(request));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // En dev (localhost) los assets no llevan hash: cachearlos rompería el
  // recargado en caliente.
  if (request.method !== "GET" || url.origin !== self.location.origin || url.hostname === "localhost") return;
  event.respondWith(url.pathname.startsWith("/_next/static/") ? cachePrimero(request) : redPrimero(request));
});

// La página manda lo que cargó antes de que este SW la controlara (ver
// Providers.tsx). Solo lo que todavía no está, y solo mismo origen.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "cachear" || !Array.isArray(event.data.urls)) return;
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        event.data.urls
          .map((u) => new URL(u, self.location.origin))
          .filter((u) => u.origin === self.location.origin && u.hostname !== "localhost")
          .map(async (u) => {
            if (await cache.match(u.href)) return;
            try {
              await guardar(new Request(u.href), await fetch(u.href));
            } catch {
              // sin red o recurso caído: se guardará la próxima vez que se pida
            }
          }),
      ),
    ),
  );
});

// --- Eventos offline (Anexo D.3) ---
// Cambios de foco del alumno sin red, en IndexedDB. Se mandan en lote al
// volver la red: por Background Sync ("sync") o cuando la página avisa
// que reconectó ("sincronizar"). Cada registro lleva api/código/token
// porque el SW no tiene la sesión de la página.

const TAG_SYNC = "ens-eventos-offline";

function abrirDb() {
  return new Promise((ok, mal) => {
    const req = indexedDB.open("ens", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("eventos", { autoIncrement: true });
    req.onsuccess = () => ok(req.result);
    req.onerror = () => mal(req.error);
  });
}

function pedido(req) {
  return new Promise((ok, mal) => {
    req.onsuccess = () => ok(req.result);
    req.onerror = () => mal(req.error);
  });
}

async function encolar(evento) {
  const db = await abrirDb();
  await pedido(db.transaction("eventos", "readwrite").objectStore("eventos").add(evento));
}

async function sincronizar() {
  const db = await abrirDb();
  const store = db.transaction("eventos", "readonly").objectStore("eventos");
  const [claves, eventos] = await Promise.all([pedido(store.getAllKeys()), pedido(store.getAll())]);

  // Un POST por clase; el token más nuevo de esa clase.
  const lotes = new Map();
  eventos.forEach((e, i) => {
    const k = `${e.api}|${e.codigo}`;
    const lote = lotes.get(k) ?? { api: e.api, codigo: e.codigo, token: e.token, claves: [], eventos: [] };
    lote.token = e.token;
    lote.claves.push(claves[i]);
    lote.eventos.push({ estado: e.estado, tsClient: e.tsClient });
    lotes.set(k, lote);
  });

  let pendiente = false;
  for (const lote of lotes.values()) {
    let res;
    try {
      res = await fetch(`${lote.api}/sesiones/${encodeURIComponent(lote.codigo)}/eventos-offline`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${lote.token}` },
        body: JSON.stringify({ eventos: lote.eventos.slice(-500) }),
      });
    } catch {
      pendiente = true; // sigue sin red: queda para el próximo intento
      continue;
    }
    if (res.status >= 500) {
      pendiente = true;
      continue;
    }
    // 2xx, o un 4xx que nunca va a andar (sesión inexistente, token vencido): se descarta.
    const tx = db.transaction("eventos", "readwrite").objectStore("eventos");
    await Promise.all(lote.claves.map((c) => pedido(tx.delete(c))));
  }
  // Con Background Sync, fallar hace que el navegador reintente más tarde.
  if (pendiente) throw new Error("eventos offline pendientes");
}

self.addEventListener("sync", (event) => {
  if (event.tag === TAG_SYNC) event.waitUntil(sincronizar());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "encolar") event.waitUntil(encolar(event.data.evento));
  if (event.data?.type === "sincronizar") event.waitUntil(sincronizar().catch(() => {}));
});

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
