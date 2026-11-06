import type { ComponentProps } from "react";
import type { Badge } from "../components/Badge";
import type { EstadoPresencia } from "../types/sesiones";

// Compartido entre el panel en vivo del docente y los historiales de
// preceptor/director.
export const ETIQUETA_ESTADO: Record<EstadoPresencia, string> = {
  conectado: "Conectado",
  fuera_de_foco: "Fuera de foco",
  ausente_digital: "Ausente digital",
  pantalla_suspendida: "Pantalla suspendida",
  sin_red: "Sin red",
  desconectado: "Desconectado",
};

export const COLOR_ESTADO: Record<EstadoPresencia, ComponentProps<typeof Badge>["variante"]> = {
  conectado: "verde",
  fuera_de_foco: "rojo",
  ausente_digital: "rojo",
  pantalla_suspendida: "amarillo",
  sin_red: "amarillo",
  desconectado: "rojo",
};

// Distingue infracción pedagógica de incidente técnico (anteproyecto,
// filtrado por tipo de desconexión).
export const ETIQUETA_DESCONEXION: Record<string, string> = {
  CLEAN_CLOSE: "Salió de la sesión",
  HEARTBEAT_TIMEOUT: "Corte de red",
  GRACE_EXPIRED: "Venció el período de gracia",
  VOLUNTARY_HIDDEN: "Ocultó la pestaña",
};
