// URL del backend, pedida una vez por carga de página a /api/config (ver
// app/api/config/route.ts). La última conocida queda en localStorage: sin
// red (PWA offline) se usa esa.
const CLAVE = "ens_api_url";
const FALLBACK = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

let actual: string | undefined;
let pedido: Promise<string> | undefined;

function guardada(): string | null {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

export function urlBackend(): Promise<string> {
  pedido ??= fetch("/api/config", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<{ apiUrl: string }>) : Promise.reject(new Error(String(r.status)))))
    .then(({ apiUrl }) => {
      try {
        localStorage.setItem(CLAVE, apiUrl);
      } catch {
        // storage bloqueado: queda solo en memoria
      }
      return apiUrl;
    })
    .catch(() => guardada() ?? FALLBACK)
    .then((url) => (actual = url));
  return pedido;
}

// Para lo que se arma durante el render (src de un iframe): para entonces
// ya se pidió algo a la API, así que la URL ya se resolvió.
export function urlBackendActual(): string {
  return actual ?? (typeof window === "undefined" ? FALLBACK : (guardada() ?? FALLBACK));
}

// Un error de red puede ser que el túnel cambió de URL: el próximo pedido
// vuelve a preguntar.
export function olvidarUrlBackend(): void {
  pedido = undefined;
}

export async function urlWebSocket(): Promise<string> {
  return (await urlBackend()).replace(/^http/, "ws");
}
