"use client";

import { useState } from "react";
import { Icono } from "@/shared/components/Icono";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import {
  SEVERIDAD,
  TITULO_NOTIFICACION,
  textoCompleto,
  useNotificaciones,
  type Notificacion,
  type Severidad,
} from "../hooks/useNotificaciones";

const PUNTO: Record<Severidad, string> = {
  presencia: "bg-alerta",
  seguridad: "bg-error",
  sistema: "bg-carbon/40",
};

// "hace 3 min" para lo abierto; hora para lo resuelto.
function cuando(iso: string, abierta: boolean): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (abierta && min < 1) return "ahora";
  if (abierta && min < 60) return `hace ${min} min`;
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function Fila({ n }: { n: Notificacion }) {
  const abierta = !n.resueltaAt;
  return (
    <li className={`flex gap-3 rounded-2xl px-3 py-2.5 ${abierta ? "bg-papel" : ""}`}>
      <span
        aria-hidden="true"
        className={`mt-1.5 size-2 shrink-0 rounded-full ${abierta ? PUNTO[SEVERIDAD[n.tipo]] : "bg-carbon/20"}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={`truncate text-sm font-semibold ${abierta ? "text-carbon" : "text-carbon/60"}`}>
            {n.alumnoNombre ?? TITULO_NOTIFICACION[n.tipo]}
          </p>
          <span className="shrink-0 text-[11px] text-carbon/50 tabular-nums">{cuando(n.createdAt, abierta)}</span>
        </div>
        <p className={`text-sm ${abierta ? "text-carbon/80" : "text-carbon/55"}`}>
          {n.alumnoNombre ? n.mensaje : textoCompleto(n)}
          {n.sesionCodigo && <span className="text-carbon/45"> · clase {n.sesionCodigo}</span>}
        </p>
      </div>
    </li>
  );
}

// Campana de la barra superior: contador de alertas abiertas + panel con
// lo que pasa ahora y lo que ya se resolvió. Llegan en vivo por WebSocket
// y, con la pestaña oculta, como notificación del sistema.
export function NotificacionesCampana() {
  const { abiertas, resueltas, permiso, pedirPermiso } = useNotificaciones();
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="sm:relative" onKeyDown={(e) => e.key === "Escape" && setAbierto(false)}>
      <button
        type="button"
        aria-label={`Alertas${abiertas.length ? ` (${abiertas.length} abiertas)` : ""}`}
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
        className="relative grid size-11 place-items-center rounded-full border border-carbon/10 bg-white text-carbon transition-colors hover:border-carbon/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon"
      >
        <Icono nombre="campana" />
        {abiertas.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-error px-1 text-center text-[11px] leading-5 font-bold text-arena ring-2 ring-papel tabular-nums">
            {abiertas.length > 99 ? "99+" : abiertas.length}
          </span>
        )}
      </button>

      {abierto && (
        <>
          <button
            type="button"
            aria-label="Cerrar alertas"
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default bg-carbon/20 sm:bg-transparent"
            onClick={() => setAbierto(false)}
          />
          {/* Mobile: hoja a lo ancho bajo la barra. Desktop: popover. */}
          <div className="entrar fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4.5rem)] z-50 flex max-h-[70dvh] flex-col rounded-3xl border border-carbon/10 bg-white shadow-flotante sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-96">
            <div className="flex items-center justify-between gap-2 border-b border-carbon/[0.07] px-5 py-4">
              <h2 className="font-display text-lg font-bold text-carbon">Alertas</h2>
              {permiso === "default" && (
                <button
                  type="button"
                  onClick={pedirPermiso}
                  className="min-h-9 rounded-lg px-2 text-xs font-semibold text-carbon/70 hover:text-carbon focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon"
                >
                  Avisarme fuera de la app
                </button>
              )}
            </div>

            <div className="space-y-4 overflow-y-auto p-3">
              {permiso === "denied" && (
                <MensajeEstado tipo="info">
                  Los avisos del sistema están bloqueados. Habilitalos desde la configuración del navegador.
                </MensajeEstado>
              )}

              {abiertas.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-carbon/55">Todo en orden por ahora.</p>
              ) : (
                <ul className="space-y-1">
                  {abiertas.map((n) => (
                    <Fila key={n.id} n={n} />
                  ))}
                </ul>
              )}

              {resueltas.length > 0 && (
                <div>
                  <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.14em] text-carbon/50 uppercase">
                    Resueltas
                  </p>
                  <ul className="space-y-1">
                    {resueltas.slice(0, 20).map((n) => (
                      <Fila key={n.id} n={n} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
