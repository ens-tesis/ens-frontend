"use client";

import { useSyncExternalStore } from "react";

// sessionStorage no notifica cambios propios (el evento "storage" del
// browser solo dispara en OTRAS pestañas), así que no hace falta una
// suscripción real acá: leemos el valor una vez de forma segura para SSR
// (useSyncExternalStore evita el clásico "setState dentro de un effect"
// para hidratar desde una API del browser). Una vez que el componente
// que la usa escribe un valor nuevo y eso dispara algún otro re-render
// (por ejemplo el propio estado de una mutation), este hook vuelve a leer
// el valor actual de sessionStorage en ese re-render.
function suscribirNoOp(): () => void {
  return () => {};
}

export function useSessionStorageInicial(clave: string): string | null {
  return useSyncExternalStore(
    suscribirNoOp,
    () => window.sessionStorage.getItem(clave),
    () => null,
  );
}
