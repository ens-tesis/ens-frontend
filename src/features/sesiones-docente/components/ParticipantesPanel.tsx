import { Badge } from "@/shared/components/Badge";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import type { EstadoPresencia, ParticipanteConectado } from "@/shared/types/sesiones";

interface ParticipantesPanelProps {
  participantes: ParticipanteConectado[];
  cargando: boolean;
}

const ETIQUETA_ESTADO: Record<EstadoPresencia, string> = {
  conectado: "Conectado",
  fuera_de_foco: "Fuera de foco",
  ausente_digital: "Ausente digital",
  pantalla_suspendida: "Pantalla suspendida",
  sin_red: "Sin red",
  desconectado: "Desconectado",
};

export function ParticipantesPanel({ participantes, cargando }: ParticipantesPanelProps) {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-carbon">
        Participantes conectados <Badge variante="celeste">{participantes.length}</Badge>
      </h2>

      {cargando ? (
        <MensajeEstado tipo="cargando">Cargando participantes...</MensajeEstado>
      ) : participantes.length === 0 ? (
        <MensajeEstado tipo="vacio">Todavía no se unió ningún alumno.</MensajeEstado>
      ) : (
        <ul className="space-y-2">
          {participantes.map((p) => (
            <li
              key={p.alumnoId}
              className="flex items-center justify-between rounded-lg border border-carbon/10 bg-arena px-4 py-3"
            >
              <span className="text-sm text-carbon">
                {p.nombre} {p.apellido}
              </span>
              <Badge variante="celeste">{ETIQUETA_ESTADO[p.estadoActual]}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
