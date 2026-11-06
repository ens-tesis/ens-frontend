import { Badge } from "@/shared/components/Badge";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { CLASE_FILA, Tarjeta } from "@/shared/components/Tarjeta";
import { COLOR_ESTADO, ETIQUETA_ESTADO } from "@/shared/lib/presencia";
import type { EstadoPresencia, ParticipanteConectado } from "@/shared/types/sesiones";

interface ParticipantesPanelProps {
  participantes: ParticipanteConectado[];
  cargando: boolean;
}

// Lo que necesita atención arriba: el docente mira la lista para saber a
// quién acercarse, no para leerla entera.
const PRIORIDAD_ESTADO: Record<EstadoPresencia, number> = {
  desconectado: 0,
  ausente_digital: 1,
  sin_red: 2,
  fuera_de_foco: 3,
  pantalla_suspendida: 4,
  conectado: 5,
};

export function ParticipantesPanel({ participantes, cargando }: ParticipantesPanelProps) {
  if (cargando) return <MensajeEstado tipo="cargando">Cargando alumnos...</MensajeEstado>;
  if (participantes.length === 0) {
    return (
      <Tarjeta>
        <MensajeEstado tipo="vacio">
          Todavía no se unió ningún alumno. Compartí el código de la clase para que entren.
        </MensajeEstado>
      </Tarjeta>
    );
  }

  const ordenados = [...participantes].sort(
    (a, b) => PRIORIDAD_ESTADO[a.estadoActual] - PRIORIDAD_ESTADO[b.estadoActual],
  );

  return (
    <ul className="grid gap-2 md:grid-cols-2">
      {ordenados.map((p) => (
        <li key={p.alumnoId} className={`${CLASE_FILA} flex items-center gap-3 bg-white p-3 pr-4 shadow-tarjeta`}>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-arena text-sm font-bold text-carbon">
            {`${p.nombre[0] ?? ""}${p.apellido[0] ?? ""}`.toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-carbon">
              {p.nombre} {p.apellido}
            </span>
            <span className="block truncate text-xs text-carbon/55">{p.email}</span>
          </span>
          <Badge variante={COLOR_ESTADO[p.estadoActual]} punto={p.estadoActual === "conectado" ? "vivo" : true}>
            {ETIQUETA_ESTADO[p.estadoActual]}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
