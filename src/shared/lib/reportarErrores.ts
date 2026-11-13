import { urlBackend } from "../api/backendUrl";
import { getToken } from "../auth/token";

// Errores de JS sin capturar → POST /errores (Auditoría del admin). Con
// fetch y no con `api`: si el error viene del propio cliente HTTP no tiene
// que volver a entrar por ahí. Tope por carga de página para no inundar
// el backend con un error que se repite en bucle.
const TOPE_POR_PAGINA = 10;
let enviados = 0;

function reportar(error: unknown, mensajePorDefecto: string): void {
  if (enviados >= TOPE_POR_PAGINA) return;
  enviados += 1;
  const err = error instanceof Error ? error : null;
  const token = getToken();
  void urlBackend()
    .then((base) =>
      fetch(`${base}/errores`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({
          mensaje: (err?.message || mensajePorDefecto || "Error desconocido").slice(0, 2000),
          ...(err?.stack && { stack: err.stack.slice(0, 8000) }),
          ruta: location.pathname.slice(0, 500),
        }),
        keepalive: true,
      }),
    )
    .catch(() => {
      // Sin red o backend caído: no hay a dónde reportarlo.
    });
}

// Devuelve la función que saca los listeners.
export function escucharErroresGlobales(): () => void {
  const alError = (e: ErrorEvent) => reportar(e.error, e.message);
  const alRechazo = (e: PromiseRejectionEvent) => reportar(e.reason, String(e.reason));
  window.addEventListener("error", alError);
  window.addEventListener("unhandledrejection", alRechazo);
  return () => {
    window.removeEventListener("error", alError);
    window.removeEventListener("unhandledrejection", alRechazo);
  };
}
