"use client";

import { useState } from "react";
import { Badge } from "@/shared/components/Badge";
import { Boton } from "@/shared/components/Boton";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { useNotificaciones, type TipoNotificacion } from "./useNotificaciones";

const COLOR: Record<TipoNotificacion, "rojo" | "amarillo"> = {
  ausente_digital: "rojo",
  sin_red: "amarillo",
  desconectado: "rojo",
  distracciones_reiteradas: "rojo",
};

const horaCorta = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });

// Campana del header: contador de no leídas + panel desplegable. Las
// alertas llegan en vivo por WebSocket y además como notificación del
// sistema si el usuario la habilitó.
export function NotificacionesCampana() {
  const { notificaciones, noLeidas, marcarLeidas, permiso, pedirPermiso } = useNotificaciones();
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notificaciones${noLeidas ? ` (${noLeidas} sin leer)` : ""}`}
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
        className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-carbon/20 text-carbon hover:bg-carbon/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {noLeidas > 0 && (
          <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-error px-1 text-center text-xs font-semibold leading-5 text-arena">
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] space-y-3 rounded-xl border border-carbon/15 bg-arena p-4 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-carbon">Alertas</h2>
            {noLeidas > 0 && (
              <button type="button" onClick={marcarLeidas} className="text-xs font-medium text-carbon underline underline-offset-2">
                Marcar todas como leídas
              </button>
            )}
          </div>

          {permiso === "default" && (
            <Boton variante="sutil" className="w-full" onClick={pedirPermiso}>
              Activar notificaciones del dispositivo
            </Boton>
          )}
          {permiso === "denied" && (
            <MensajeEstado tipo="info">
              Las notificaciones del dispositivo están bloqueadas en el navegador.
            </MensajeEstado>
          )}

          {notificaciones.length === 0 ? (
            <MensajeEstado tipo="vacio">Sin alertas por ahora.</MensajeEstado>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {notificaciones.map((n) => (
                <li
                  key={n.id}
                  className={`rounded-lg border px-3 py-2 text-sm ${n.leida ? "border-carbon/10 text-carbon/70" : "border-carbon/25 bg-carbon/5 text-carbon"}`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <Badge variante={COLOR[n.tipo]}>{n.tipo.replace("_", " ")}</Badge>
                    <span className="text-xs text-carbon/60">{horaCorta(n.createdAt)}</span>
                  </div>
                  {n.mensaje}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
