export type EstadoPresencia =
  | "conectado"
  | "fuera_de_foco"
  | "ausente_digital"
  | "pantalla_suspendida"
  | "sin_red"
  | "desconectado";

export interface Sesion {
  id: number;
  codigo: string;
  docenteId: number;
  cursoId: number | null;
  gracePeriodSeg: number;
  heartbeatIntervaloSeg: number;
  activa: boolean;
  iniciadaAt: string;
  finalizadaAt: string | null;
}

export interface WhitelistUrl {
  id: number;
  sesionId: number;
  url: string;
  agregadoPor: number;
  activo: boolean;
  createdAt: string;
  removedAt: string | null;
}

export interface ParticipanteConectado {
  alumnoId: number;
  nombre: string;
  apellido: string;
  email: string;
  estadoActual: EstadoPresencia;
  joinedAt: string;
}

export interface SesionCompleta {
  sesion: Sesion;
  whitelist: WhitelistUrl[];
  participantes: ParticipanteConectado[];
}

export interface WhitelistUpdateMessage {
  type: "whitelist_update";
  sesionCodigo: string;
  whitelist: WhitelistUrl[];
}

export interface ParticipantesUpdateMessage {
  type: "participantes_update";
  sesionCodigo: string;
  participantes: ParticipanteConectado[];
}

export type SesionWsMessage = WhitelistUpdateMessage | ParticipantesUpdateMessage;

// Único mensaje que manda el cliente (alumno) hoy: reporte de foco de la
// pestaña. Ver useSesionSocket.ts (enviarMensaje) y sesiones.ws.ts (backend).
export interface PresenciaClienteMessage {
  type: "presencia";
  estado: "conectado" | "fuera_de_foco";
}
