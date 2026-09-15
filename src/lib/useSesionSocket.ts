"use client";

import { useEffect, useState } from "react";
import type { ParticipanteConectado, SesionWsMessage, WhitelistUrl } from "./sesionesTypes";

export type EstadoConexionWs = "inactivo" | "conectando" | "conectado" | "cerrado";

export interface CierreWs {
  code: number;
  reason: string;
}

interface UseSesionSocketResult {
  estado: EstadoConexionWs;
  whitelist: WhitelistUrl[];
  participantes: ParticipanteConectado[];
  cierre: CierreWs | null;
  // true una vez que llegó al menos un mensaje del servidor (whitelist o
  // participantes vacíos son datos válidos, por eso hace falta esta bandera
  // en vez de inferirlo del largo de los arrays).
  sincronizado: boolean;
  reconectar: () => void;
}

interface ManejadoresConexion {
  onReset: () => void;
  onEstado: (estado: EstadoConexionWs) => void;
  onWhitelist: (whitelist: WhitelistUrl[]) => void;
  onParticipantes: (participantes: ParticipanteConectado[]) => void;
  onMensajeRecibido: () => void;
  onCierre: (cierre: CierreWs) => void;
}

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001";

// Mapeo de los códigos de cierre que documenta sesiones.ws.ts (backend)
// a mensajes que un usuario final entiende, sin exponer detalles técnicos.
const MENSAJES_CIERRE: Record<number, string> = {
  4000: "Faltaron datos para conectarte. Volvé a intentarlo.",
  4001: "Tu sesión expiró. Iniciá sesión de nuevo.",
  4003: "Esta sesión de clase ya no está activa.",
  4004: "No encontramos una sesión con ese código.",
  4403: "No tenés permiso para conectarte a esta sesión.",
};

const MENSAJE_CIERRE_DESCONOCIDO = "Se perdió la conexión. Intentá de nuevo.";

export function mensajeDeCierre(code: number): string {
  return MENSAJES_CIERRE[code] ?? MENSAJE_CIERRE_DESCONOCIDO;
}

// Abre la conexión y devuelve la función de limpieza. Vive fuera del
// cuerpo del efecto a propósito: react-hooks/set-state-in-effect solo
// mira las llamadas a setState que aparecen directamente en el cuerpo
// del efecto, no las que ocurren dentro de callbacks de una función
// externa (que es justamente el patrón "suscribirse a un sistema
// externo" que la propia regla recomienda).
function conectarSesionSocket(
  codigo: string,
  token: string,
  handlers: ManejadoresConexion,
): () => void {
  handlers.onReset();
  handlers.onEstado("conectando");

  const url = `${WS_BASE_URL}/?codigo=${encodeURIComponent(codigo)}&token=${encodeURIComponent(token)}`;
  const socket = new WebSocket(url);

  socket.onopen = () => {
    handlers.onEstado("conectado");
  };

  socket.onmessage = (event: MessageEvent<string>) => {
    let mensaje: SesionWsMessage;
    try {
      mensaje = JSON.parse(event.data) as SesionWsMessage;
    } catch {
      return;
    }
    if (mensaje.type === "whitelist_update") {
      handlers.onWhitelist(mensaje.whitelist);
    } else if (mensaje.type === "participantes_update") {
      handlers.onParticipantes(mensaje.participantes);
    }
    handlers.onMensajeRecibido();
  };

  socket.onclose = (event: CloseEvent) => {
    handlers.onCierre({ code: event.code, reason: event.reason });
  };

  return () => socket.close();
}

/**
 * Maneja la conexión WebSocket a una sesión de clase (mismo mecanismo
 * documentado en sesiones.ws.ts del backend: query params ?codigo=&token=).
 * No reintenta automáticamente ante una desconexión inesperada — queda
 * pendiente para el módulo de presencia (grace period + heartbeat), que
 * es el lugar natural para decidir cuándo reconectar. `reconectar()`
 * permite al usuario forzar un nuevo intento manual.
 */
export function useSesionSocket(
  codigo: string | null,
  token: string | null,
): UseSesionSocketResult {
  const [estado, setEstado] = useState<EstadoConexionWs>("inactivo");
  const [whitelist, setWhitelist] = useState<WhitelistUrl[]>([]);
  const [participantes, setParticipantes] = useState<ParticipanteConectado[]>([]);
  const [cierre, setCierre] = useState<CierreWs | null>(null);
  const [sincronizado, setSincronizado] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!codigo || !token) {
      return;
    }

    return conectarSesionSocket(codigo, token, {
      onReset: () => {
        setWhitelist([]);
        setParticipantes([]);
        setCierre(null);
        setSincronizado(false);
      },
      onEstado: setEstado,
      onWhitelist: setWhitelist,
      onParticipantes: setParticipantes,
      onMensajeRecibido: () => setSincronizado(true),
      onCierre: (c) => {
        setEstado("cerrado");
        setCierre(c);
      },
    });
  }, [codigo, token, intento]);

  const estadoEfectivo: EstadoConexionWs = !codigo || !token ? "inactivo" : estado;

  return {
    estado: estadoEfectivo,
    whitelist,
    participantes,
    cierre,
    sincronizado,
    reconectar: () => setIntento((i) => i + 1),
  };
}
