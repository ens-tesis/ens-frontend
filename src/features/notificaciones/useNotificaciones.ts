"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useSyncExternalStore } from "react";
import { api } from "@/shared/api/client";
import { getToken } from "@/shared/auth/token";

export type TipoNotificacion =
  | "ausente_digital"
  | "sin_red"
  | "desconectado"
  | "distracciones_reiteradas"
  | "no_se_unio";

export interface Notificacion {
  id: number;
  alumnoId: number | null;
  sesionId: number | null;
  sesionCodigo: string | null;
  tipo: TipoNotificacion;
  mensaje: string;
  leida: boolean;
  createdAt: string;
}

export const TITULO_NOTIFICACION: Record<TipoNotificacion, string> = {
  ausente_digital: "Ausente digital",
  sin_red: "Alumno sin red",
  desconectado: "Alumno desconectado",
  distracciones_reiteradas: "Distracciones reiteradas",
  no_se_unio: "No se unió a la clase",
};

const CLAVE = ["notificaciones"];
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001";
const BACKOFF_MAX_MS = 30000;

type Permiso = NotificationPermission | "no-soportado";

function leerPermiso(): Permiso {
  return typeof Notification === "undefined" ? "no-soportado" : Notification.permission;
}

// Notificación del sistema (estilo app). Vía Service Worker y no con
// `new Notification()`: en Android el constructor no está permitido.
function mostrarNotificacionSistema(n: Notificacion): void {
  if (leerPermiso() !== "granted" || !("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.ready.then((reg) =>
    reg.showNotification(TITULO_NOTIFICACION[n.tipo], {
      body: n.mensaje,
      icon: "/icon.svg",
      tag: `ens-${n.id}`,
      data: { url: window.location.pathname },
    }),
  );
}

// Canal en vivo (ws://.../?canal=notificaciones&token=), con el mismo
// criterio de reconexión que useSesionSocket: backoff exponencial sin
// límite, salvo token inválido (4001), que es definitivo.
function conectarCanal(token: string, onNotificacion: (n: Notificacion) => void): () => void {
  let cerrado = false;
  let intentos = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let socket: WebSocket | undefined;

  function abrir(): void {
    socket = new WebSocket(`${WS_BASE_URL}/?canal=notificaciones&token=${encodeURIComponent(token)}`);
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
      intentos += 1;
      timer = setTimeout(abrir, Math.min(1000 * 2 ** (intentos - 1), BACKOFF_MAX_MS));
    };
  }

  abrir();
  return () => {
    cerrado = true;
    clearTimeout(timer);
    socket?.close();
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
    return conectarCanal(token, (n) => {
      queryClient.setQueryData<Notificacion[]>(CLAVE, (prev) => [n, ...(prev ?? [])].slice(0, 50));
      // Historial/métricas en pantalla quedan desactualizados con un evento nuevo.
      void queryClient.invalidateQueries({ queryKey: ["reportes"] });
      mostrarNotificacionSistema(n);
    });
  }, [token, queryClient]);

  const marcarLeidas = useMutation({
    mutationFn: () => api.post("/notificaciones/leidas"),
    onSuccess: () =>
      queryClient.setQueryData<Notificacion[]>(CLAVE, (prev) =>
        (prev ?? []).map((n) => ({ ...n, leida: true })),
      ),
  });

  const notificaciones = query.data ?? [];
  return {
    notificaciones,
    noLeidas: notificaciones.filter((n) => !n.leida).length,
    marcarLeidas: () => marcarLeidas.mutate(),
    permiso,
    pedirPermiso: () =>
      void Notification.requestPermission().then(() => setVersionPermiso((v) => v + 1)),
  };
}
