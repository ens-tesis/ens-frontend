"use client";

import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useState, useSyncExternalStore } from "react";
import { api } from "@/shared/api/client";
import { getToken } from "@/shared/auth/token";
import { pedirPaseConexion } from "@/shared/lib/paseConexion";

export type TipoNotificacion =
  | "ausente_digital"
  | "sin_red"
  | "desconectado"
  | "distracciones_reiteradas"
  | "no_se_unio"
  | "otro_dispositivo"
  | "contingencia";

// Una alerta es un incidente: abierta (resueltaAt null) mientras dure,
// resuelta cuando el alumno vuelve o termina la clase. Un cambio
// (sin_red -> desconectado, o resolverse) llega como la misma fila por WS.
export interface Notificacion {
  id: number;
  alumnoId: number | null;
  alumnoNombre: string | null;
  sesionId: number | null;
  sesionCodigo: string | null;
  curso: string | null;
  tipo: TipoNotificacion;
  mensaje: string;
  createdAt: string;
  resueltaAt: string | null;
}

export const TITULO_NOTIFICACION: Record<TipoNotificacion, string> = {
  ausente_digital: "Ausente digital",
  sin_red: "Sin red",
  desconectado: "Desconectado",
  distracciones_reiteradas: "Distracciones reiteradas",
  no_se_unio: "No se unió",
  otro_dispositivo: "Otro dispositivo",
  contingencia: "Modo contingencia",
};

export type Severidad = "presencia" | "seguridad" | "sistema";

export const SEVERIDAD: Record<TipoNotificacion, Severidad> = {
  ausente_digital: "presencia",
  sin_red: "presencia",
  desconectado: "presencia",
  distracciones_reiteradas: "presencia",
  no_se_unio: "presencia",
  otro_dispositivo: "seguridad",
  contingencia: "sistema",
};

export const textoCompleto = (n: Notificacion) =>
  n.alumnoNombre ? `${n.alumnoNombre} ${n.mensaje}` : n.mensaje;

// "clase 1° A"; el código solo si la clase no tiene curso.
export const textoClase = (n: Notificacion): string | null =>
  n.curso ? `clase ${n.curso}` : n.sesionCodigo ? `clase ${n.sesionCodigo}` : null;

const CLAVE = ["notificaciones"];
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001";
const BACKOFF_MAX_MS = 30000;

type Permiso = NotificationPermission | "no-soportado";

function leerPermiso(): Permiso {
  return typeof Notification === "undefined" ? "no-soportado" : Notification.permission;
}

// Notificación del sistema (estilo app), solo si la pestaña está oculta:
// con la app a la vista ya está la campana y el banner. Vía Service
// Worker y no con `new Notification()`: en Android el constructor no está
// permitido. Una por alumno y clase (tag): la escalada reemplaza a la
// anterior en vez de apilarse, y resolverse la cierra.
function notificacionSistema(n: Notificacion): void {
  if (leerPermiso() !== "granted" || !("serviceWorker" in navigator)) return;
  const tag = `ens-${n.sesionId}-${n.alumnoId ?? n.tipo}`;
  void navigator.serviceWorker.ready.then(async (reg) => {
    if (n.resueltaAt || !document.hidden) {
      for (const abierta of await reg.getNotifications({ tag })) abierta.close();
      return;
    }
    await reg.showNotification(TITULO_NOTIFICACION[n.tipo], {
      body: [textoCompleto(n), textoClase(n)].filter(Boolean).join(" · "),
      icon: "/icon.svg",
      tag,
      data: { url: window.location.pathname },
    });
  });
}

// Canal en vivo (ws://.../?canal=notificaciones&pase=), con el mismo
// criterio de reconexión que useSesionSocket: backoff exponencial sin
// límite, salvo token inválido (4001), que es definitivo. Cada intento
// pide su pase de conexión: el token no va en la URL.
function conectarCanal(onNotificacion: (n: Notificacion) => void): () => void {
  let cerrado = false;
  let intentos = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let socket: WebSocket | undefined;

  function reintentar(): void {
    intentos += 1;
    timer = setTimeout(abrir, Math.min(1000 * 2 ** (intentos - 1), BACKOFF_MAX_MS));
  }

  function abrir(): void {
    pedirPaseConexion().then(
      (pase) => {
        // null: el token ya no sirve, igual que un cierre 4001.
        if (!cerrado && pase !== null) conectar(pase);
      },
      () => {
        if (!cerrado) reintentar();
      },
    );
  }

  function conectar(pase: string): void {
    socket = new WebSocket(`${WS_BASE_URL}/?canal=notificaciones&pase=${encodeURIComponent(pase)}`);
    socket.onopen = () => {
      intentos = 0;
    };
    socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(event.data) as { type: string; notificacion: Notificacion };
        if (msg.type === "notificacion") onNotificacion(msg.notificacion);
      } catch {
        // mensaje inválido: se ignora
      }
    };
    socket.onclose = (event) => {
      if (cerrado || event.code === 4001) return;
      reintentar();
    };
  }

  abrir();
  return () => {
    cerrado = true;
    clearTimeout(timer);
    socket?.close();
  };
}

// Un solo canal por pestaña aunque varios componentes (campana, banner)
// usen el hook: el primero lo abre, el último lo cierra.
let usosDelCanal = 0;
let cerrarCanal: (() => void) | undefined;

function compartirCanal(queryClient: QueryClient): () => void {
  if (usosDelCanal++ === 0) {
    cerrarCanal = conectarCanal((n) => {
      queryClient.setQueryData<Notificacion[]>(CLAVE, (prev) =>
        [n, ...(prev ?? []).filter((p) => p.id !== n.id)].slice(0, 50),
      );
      // Historial/métricas en pantalla quedan desactualizados con un evento nuevo.
      void queryClient.invalidateQueries({ queryKey: ["reportes"] });
      notificacionSistema(n);
    });
  }
  return () => {
    if (--usosDelCanal === 0) cerrarCanal?.();
  };
}

export function useNotificaciones() {
  const queryClient = useQueryClient();
  const token = getToken();
  // Re-lee Notification.permission después de pedirlo (no hay evento).
  const [, setVersionPermiso] = useState(0);
  const permiso = useSyncExternalStore(
    () => () => {},
    leerPermiso,
    () => "default" as Permiso,
  );

  const query = useQuery({
    queryKey: CLAVE,
    queryFn: () =>
      api.get<{ notificaciones: Notificacion[] }>("/notificaciones").then((r) => r.data.notificaciones),
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (!token) return;
    return compartirCanal(queryClient);
  }, [token, queryClient]);

  const notificaciones = query.data ?? [];
  return {
    abiertas: notificaciones.filter((n) => !n.resueltaAt),
    resueltas: notificaciones.filter((n) => n.resueltaAt),
    permiso,
    pedirPermiso: () =>
      void Notification.requestPermission().then(() => setVersionPermiso((v) => v + 1)),
  };
}
