"use client";

import { useSyncExternalStore } from "react";
import { getToken } from "./session";

// Mismo motivo que useSessionStorageInicial: leer localStorage
// directamente en el cuerpo del render (getToken()) difiere entre server
// (siempre null, no hay localStorage) y cliente, y si esa diferencia
// decide qué JSX se muestra, React tira "hydration failed". Con
// useSyncExternalStore el server y el primer render del cliente
// coinciden (null), y recién después de hidratar se sincroniza con el
// valor real.
function suscribirNoOp(): () => void {
  return () => {};
}

export function useTokenInicial(): string | null {
  return useSyncExternalStore(suscribirNoOp, getToken, () => null);
}
