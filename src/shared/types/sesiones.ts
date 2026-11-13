export type EstadoPresencia =
  | "conectado"
  | "fuera_de_foco"
  | "ausente_digital"
  | "actividad_reducida"
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
  nombre: string | null;
  agregadoPor: number;
  activo: boolean;
  modo: "directo" | "mirror" | "proxy_general" | "proxy_sesion" | "archivo";
  createdAt: string;
  removedAt: string | null;
}

// Link que el docente fija para que se cargue solo al abrir una clase
// (cursoId null = en todos sus cursos).
export interface LinkFijo {
  id: number;
  cursoId: number | null;
  curso: string | null;
  url: string;
  nombre: string | null;
  modo: WhitelistUrl["modo"];
}

// Sitio que el docente ya usó en otra clase del mismo curso.
export interface LinkReciente {
  url: string;
  nombre: string | null;
  modo: WhitelistUrl["modo"];
  usadoAt: string;
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
  // Solo en los cambios: se devuelve en un ack_whitelist para que el
  // backend mida la latencia de propagación (latenciaWhitelist.ts).
  envioId?: string;
}

export interface ParticipantesUpdateMessage {
  type: "participantes_update";
  sesionCodigo: string;
  participantes: ParticipanteConectado[];
}

// Modo Contingencia: se cayó la red de la mayoría (ver contingencia.ts del backend).
export interface ContingenciaUpdateMessage {
  type: "contingencia_update";
  sesionCodigo: string;
  activa: boolean;
}

export type SesionWsMessage = WhitelistUpdateMessage | ParticipantesUpdateMessage | ContingenciaUpdateMessage;

// Lo que manda el cliente (alumno): foco de la pestaña, geometría y el
// acuse de cada cambio de whitelist. Ver useSesionSocket.ts y sesiones.ws.ts.
export type PresenciaClienteMessage =
  | { type: "presencia"; estado: "conectado" | "fuera_de_foco" }
  | { type: "geometria"; reducida: boolean }
  | { type: "ack_whitelist"; envioId: string };
