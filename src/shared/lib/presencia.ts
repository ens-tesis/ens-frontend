import type { ComponentProps } from "react";
import type { Badge } from "../components/Badge";
import type { EstadoPresencia } from "../types/sesiones";

// Compartido entre el panel en vivo del docente y los historiales de
// preceptor/director.
export const ETIQUETA_ESTADO: Record<EstadoPresencia, string> = {
  conectado: "Conectado",
  fuera_de_foco: "Fuera de foco",
  ausente_digital: "Ausente digital",
  actividad_reducida: "Pantalla dividida",
  pantalla_suspendida: "Pantalla suspendida",
  sin_red: "Sin red",
  desconectado: "Desconectado",
};

export const COLOR_ESTADO: Record<EstadoPresencia, ComponentProps<typeof Badge>["variante"]> = {
  conectado: "verde",
  fuera_de_foco: "rojo",
  ausente_digital: "rojo",
  actividad_reducida: "ambar",
  pantalla_suspendida: "gris",
  sin_red: "amarillo",
  desconectado: "rojo",
};

// "45 s", "2 min", "3 min 5 s", "1 h 12 min".
export function formatoDuracion(segundos: number): string {
  const seg = Math.max(0, Math.round(segundos));
  if (seg < 60) return `${seg} s`;
  const min = Math.floor(seg / 60);
  if (min >= 60) return min % 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min / 60} h`;
  return seg % 60 ? `${min} min ${seg % 60} s` : `${min} min`;
}

// Distingue infracción pedagógica de incidente técnico (anteproyecto,
// filtrado por tipo de desconexión).
export const ETIQUETA_DESCONEXION: Record<string, string> = {
  CLEAN_CLOSE: "Salió de la sesión",
  HEARTBEAT_TIMEOUT: "Corte de red",
  GRACE_EXPIRED: "Venció el período de gracia",
  VOLUNTARY_HIDDEN: "Ocultó la pestaña",
};
