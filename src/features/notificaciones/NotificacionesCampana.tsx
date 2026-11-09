"use client";

import { useState } from "react";
import { Boton } from "@/shared/components/Boton";
import { Icono } from "@/shared/components/Icono";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import {
  TITULO_NOTIFICACION,
  useNotificaciones,
  useSilencios,
  type TipoNotificacion,
} from "./useNotificaciones";

const PAUSAS = [
  { etiqueta: "1 hora", horas: 1 },
  { etiqueta: "1 día", horas: 24 },
  { etiqueta: "1 semana", horas: 24 * 7 },
];

const CLASE_LINK =
  "min-h-8 rounded-lg px-2 text-xs font-semibold text-carbon/70 hover:text-carbon focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon disabled:opacity-50";

// sin_red es advertencia (puede volver solo); el resto, alerta.
const PUNTO: Record<TipoNotificacion, string> = {
  ausente_digital: "bg-error",
  sin_red: "bg-alerta",
  desconectado: "bg-error",
  distracciones_reiteradas: "bg-violeta",
  no_se_unio: "bg-error",
};

const horaCorta = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });

// Campana de la barra superior: contador de no leídas + panel. Las
// alertas llegan en vivo por WebSocket y además como notificación del
// sistema si el usuario la habilitó.
export function NotificacionesCampana() {
  const { notificaciones, noLeidas, marcarLeidas, permiso, pedirPermiso } = useNotificaciones();
  const [abierto, setAbierto] = useState(false);
  const { silencios, silenciar, reactivar, ocupado } = useSilencios(abierto);
  const alumnosSilenciados = new Set(silencios.filter((s) => !s.hasta).map((s) => s.alumnoId));

  return (
    <div className="sm:relative" onKeyDown={(e) => e.key === "Escape" && setAbierto(false)}>
      <button
        type="button"
        aria-label={`Alertas${noLeidas ? ` (${noLeidas} sin leer)` : ""}`}
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
        className="relative grid size-11 place-items-center rounded-full border border-carbon/10 bg-white text-carbon transition-colors hover:border-carbon/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon"
      >
        <Icono nombre="campana" />
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-error px-1 text-center text-[11px] leading-5 font-bold text-arena ring-2 ring-papel tabular-nums">
            {noLeidas > 99 ? "99+" : noLeidas}
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
              {noLeidas > 0 && (
                <button
                  type="button"
                  onClick={marcarLeidas}
                  className="min-h-9 rounded-lg px-2 text-xs font-semibold text-carbon/70 hover:text-carbon focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>

            <div className="space-y-3 overflow-y-auto p-3">
              {permiso === "default" && (
                <div className="space-y-3 rounded-2xl bg-celeste/40 p-4">
                  <p className="text-sm text-carbon">
                    Recibí las alertas aunque estés en otra app o pestaña.
                  </p>
                  <Boton variante="oscuro" className="w-full" onClick={pedirPermiso}>
                    Activar notificaciones
                  </Boton>
                </div>
              )}
              {permiso === "denied" && (
                <div className="px-2">
                  <MensajeEstado tipo="info">
                    Las notificaciones están bloqueadas. Habilitalas desde la configuración del navegador.
                  </MensajeEstado>
                </div>
              )}

              <div className="space-y-2 rounded-2xl border border-carbon/[0.07] p-3">
                {silencios.length > 0 && (
                  <ul className="space-y-1">
                    {silencios.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2 text-sm text-carbon">
                        <span className="min-w-0">
                          <span className="font-semibold">{s.alumnoNombre ?? "Todas las alertas"}</span>
                          <span className="text-carbon/60">
                            {" "}
                            · silenciado {s.hasta ? `hasta ${horaCorta(s.hasta)}` : "hasta que lo reactives"}
                          </span>
                        </span>
                        <button type="button" disabled={ocupado} onClick={() => reactivar(s.id)} className={CLASE_LINK}>
                          Reactivar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap items-center gap-1">
                  <span className="mr-1 text-xs text-carbon/60">Pausar todas por</span>
                  {PAUSAS.map((p) => (
                    <button key={p.horas} type="button" disabled={ocupado}
                      onClick={() => silenciar({ horas: p.horas })}
                      className={`${CLASE_LINK} border border-carbon/10`}>
                      {p.etiqueta}
                    </button>
                  ))}
                </div>
              </div>

              {notificaciones.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-carbon/55">Sin alertas por ahora.</p>
              ) : (
                <ul className="space-y-1">
                  {notificaciones.map((n) => (
                    <li
                      key={n.id}
                      className={`flex gap-3 rounded-2xl px-3 py-3 ${n.leida ? "" : "bg-papel"}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${n.leida ? "bg-carbon/20" : PUNTO[n.tipo]}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className={`text-sm font-semibold ${n.leida ? "text-carbon/60" : "text-carbon"}`}>
                            {TITULO_NOTIFICACION[n.tipo]}
                          </p>
                          <span className="shrink-0 text-[11px] text-carbon/50 tabular-nums">
                            {horaCorta(n.createdAt)}
                          </span>
                        </div>
                        <p className={`text-sm ${n.leida ? "text-carbon/55" : "text-carbon/80"}`}>{n.mensaje}</p>
                        {n.alumnoId !== null && !alumnosSilenciados.has(n.alumnoId) && (
                          <button type="button" disabled={ocupado}
                            onClick={() => silenciar({ alumnoId: n.alumnoId! })}
                            className={`${CLASE_LINK} -ml-2`}>
                            Silenciar a este alumno
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
