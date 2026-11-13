"use client";

import { useEffect, useRef, useState } from "react";
import { urlWebSocket } from "../api/backendUrl";
import { pedirPaseConexion } from "../lib/paseConexion";
import { guardarWhitelist } from "../store/claseSlice";
import { useAppStore } from "../store/store";
import type {
  ParticipanteConectado,
  PresenciaClienteMessage,
  SesionWsMessage,
  WhitelistUrl,
} from "../types/sesiones";

export type EstadoConexionWs =
  | "inactivo"
  | "conectando"
  | "conectado"
  | "reconectando"
  | "cerrado";

export interface CierreWs {
  code: number;
  reason: string;
}

interface UseSesionSocketResult {
  estado: EstadoConexionWs;
  whitelist: WhitelistUrl[];
  participantes: ParticipanteConectado[];
  cierre: CierreWs | null;
  contingencia: boolean;
  // true una vez que llegó al menos un mensaje del servidor (whitelist o
  // participantes vacíos son datos válidos, por eso hace falta esta bandera
  // en vez de inferirlo del largo de los arrays).
  sincronizado: boolean;
  reconectar: () => void;
  enviarMensaje: (mensaje: PresenciaClienteMessage) => void;
}

interface ManejadoresConexion {
  onReset: () => void;
  onEstado: (estado: EstadoConexionWs) => void;
  onWhitelist: (whitelist: WhitelistUrl[]) => void;
  onParticipantes: (participantes: ParticipanteConectado[]) => void;
  onContingencia: (activa: boolean) => void;
  onMensajeRecibido: () => void;
  onCierre: (cierre: CierreWs) => void;
}

// Mapeo de los códigos de cierre que documenta sesiones.ws.ts (backend)
// a mensajes que un usuario final entiende, sin exponer detalles técnicos.
const MENSAJES_CIERRE: Record<number, string> = {
  4000: "Faltaron datos para conectarte. Volvé a intentarlo.",
  4001: "Tu sesión expiró. Iniciá sesión de nuevo.",
  4003: "Esta sesión de clase ya no está activa.",
  4004: "No encontramos una sesión con ese código.",
  4010: "El docente finalizó la clase.",
  4403: "No tenés permiso para conectarte a esta sesión.",
  4404: "Esta clase es de otro curso. Revisá el código o pedile a preceptoría que te agregue al curso.",
};

const MENSAJE_CIERRE_DESCONOCIDO = "Se perdió la conexión. Intentá de nuevo.";

export function mensajeDeCierre(code: number): string {
  return MENSAJES_CIERRE[code] ?? MENSAJE_CIERRE_DESCONOCIDO;
}

// Cierres que el propio backend dispara a propósito (ver códigos arriba):
// son definitivos (token vencido, sesión inactiva, etc.) — reintentar no
// va a cambiar el resultado, así que ahí no hay backoff, se corta.
const CIERRES_DEFINITIVOS = new Set(Object.keys(MENSAJES_CIERRE).map(Number));

const BACKOFF_INICIAL_MS = 1000;
const BACKOFF_MAX_MS = 30000;

// Abre la conexión y devuelve la función de limpieza. Vive fuera del
// cuerpo del efecto a propósito: react-hooks/set-state-in-effect solo
// mira las llamadas a setState que aparecen directamente en el cuerpo
// del efecto, no las que ocurren dentro de callbacks de una función
// externa (que es justamente el patrón "suscribirse a un sistema
// externo" que la propia regla recomienda).
//
// Reconexión: ante un cierre que NO es uno de los códigos definitivos de
// la app (típicamente 1006, caída de red real) reintenta solo con backoff
// exponencial (1s, 2s, 4s... tope 30s), sin límite de intentos porque un
// wifi de colegio puede tardar en volver. `onReset` sólo se llama una vez
// al abrir la conexión por primera vez, no en cada reintento, para no
// borrar la whitelist ya conocida mientras se reconecta en segundo plano.
function conectarSesionSocket(
  codigo: string,
  handlers: ManejadoresConexion,
  socketRef: { current: WebSocket | undefined },
): () => void {
  handlers.onReset();

  let cerradoManualmente = false;
  let intentosFallidos = 0;
  let reintentoTimer: ReturnType<typeof setTimeout> | undefined;
  let socketActual: WebSocket | undefined;

  function reintentar(): void {
    intentosFallidos += 1;
    const espera = Math.min(BACKOFF_INICIAL_MS * 2 ** (intentosFallidos - 1), BACKOFF_MAX_MS);
    handlers.onEstado("reconectando");
    reintentoTimer = setTimeout(abrir, espera);
  }

  // Cada intento pide su pase de conexión (no el token en la URL).
  function abrir(): void {
    handlers.onEstado(intentosFallidos === 0 ? "conectando" : "reconectando");
    pedirPaseConexion().then(
      (pase) => {
        if (cerradoManualmente) return;
        if (pase === null) {
          handlers.onEstado("cerrado");
          handlers.onCierre({ code: 4001, reason: "Token inválido o expirado" });
          return;
        }
        void conectar(pase);
      },
      // Sin red no hay pase: mismo backoff que un socket caído.
      () => {
        if (!cerradoManualmente) reintentar();
      },
    );
  }

  async function conectar(pase: string): Promise<void> {
    const url = `${await urlWebSocket()}/?codigo=${encodeURIComponent(codigo)}&pase=${encodeURIComponent(pase)}`;
    if (cerradoManualmente) return;
    const socket = new WebSocket(url);
    socketActual = socket;
    socketRef.current = socket;

    socket.onopen = () => {
      intentosFallidos = 0;
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
        // Acuse apenas aplicada: el backend mide la ida y vuelta (≤500 ms).
        // Al docente también le llega; el backend lo ignora.
        if (mensaje.envioId) {
          const ack: PresenciaClienteMessage = { type: "ack_whitelist", envioId: mensaje.envioId };
          socket.send(JSON.stringify(ack));
        }
      } else if (mensaje.type === "participantes_update") {
        handlers.onParticipantes(mensaje.participantes);
      } else if (mensaje.type === "contingencia_update") {
        handlers.onContingencia(mensaje.activa);
      }
      handlers.onMensajeRecibido();
    };

    socket.onclose = (event: CloseEvent) => {
      if (cerradoManualmente) return;

      if (CIERRES_DEFINITIVOS.has(event.code)) {
        handlers.onEstado("cerrado");
        handlers.onCierre({ code: event.code, reason: event.reason });
        return;
      }

      // Incluye 4002 (pase vencido): el próximo intento pide uno nuevo.
      reintentar();
    };
  }

  abrir();

  return () => {
    cerradoManualmente = true;
    clearTimeout(reintentoTimer);
    socketActual?.close();
  };
}

/**
 * Maneja la conexión WebSocket a una sesión de clase (mismo mecanismo
 * documentado en sesiones.ws.ts del backend: query params ?codigo=&pase=;
 * `token` solo indica que hay sesión iniciada, no viaja en la URL).
 * Reintenta automáticamente con backoff exponencial ante una desconexión
 * inesperada (red caída); ante un cierre definitivo de la app (token
 * vencido, sesión inactiva) no reintenta solo. `reconectar()` sigue
 * disponible para forzar un reinicio manual completo (p. ej. desde el
 * botón de error del docente).
 */
export function useSesionSocket(
  codigo: string | null,
  token: string | null,
): UseSesionSocketResult {
  const [estado, setEstado] = useState<EstadoConexionWs>("inactivo");
  const [whitelist, setWhitelist] = useState<WhitelistUrl[]>([]);
  const [participantes, setParticipantes] = useState<ParticipanteConectado[]>([]);
  const [cierre, setCierre] = useState<CierreWs | null>(null);
  const [contingencia, setContingencia] = useState(false);
  const [sincronizado, setSincronizado] = useState(false);
  const [intento, setIntento] = useState(0);
  const socketRef = useRef<WebSocket>(undefined);
  const store = useAppStore();
  // Solo importa si hay sesión, no cuál token: renovarlo (cada 90 min el
  // del alumno) no tiene que cortar y reabrir el socket en plena clase.
  const haySesion = Boolean(token);

  useEffect(() => {
    if (!codigo || !haySesion) {
      return;
    }

    return conectarSesionSocket(
      codigo,
      {
        onReset: () => {
          // Última whitelist recibida (Redux, persistida cifrada).
          setWhitelist(store.getState().clase.whitelists[codigo] ?? []);
          setParticipantes([]);
          setCierre(null);
          setContingencia(false);
          setSincronizado(false);
        },
        onEstado: setEstado,
        onWhitelist: (w) => {
          store.dispatch(guardarWhitelist({ codigo, whitelist: w }));
          setWhitelist(w);
        },
        onParticipantes: setParticipantes,
        onContingencia: setContingencia,
        onMensajeRecibido: () => setSincronizado(true),
        onCierre: (c) => {
          // Cierre definitivo (clase finalizada, sin permiso...): esa
          // whitelist ya no rige.
          store.dispatch(guardarWhitelist({ codigo, whitelist: null }));
          setEstado("cerrado");
          setCierre(c);
        },
      },
      socketRef,
    );
  }, [codigo, haySesion, intento, store]);

  const estadoEfectivo: EstadoConexionWs = !codigo || !token ? "inactivo" : estado;

  return {
    estado: estadoEfectivo,
    whitelist,
    participantes,
    cierre,
    contingencia,
    sincronizado,
    reconectar: () => setIntento((i) => i + 1),
    enviarMensaje: (mensaje) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(mensaje));
      }
    },
  };
}
