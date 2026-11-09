import { useCallback, useSyncExternalStore } from "react";
import { Badge } from "@/shared/components/Badge";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { CLASE_FILA, Tarjeta } from "@/shared/components/Tarjeta";
import { COLOR_ESTADO, ETIQUETA_ESTADO, formatoDuracion } from "@/shared/lib/presencia";
import type { EstadoPresencia, ParticipanteConectado } from "@/shared/types/sesiones";
import { atencionPorAlumno, type EntradaRegistro, type Nivel } from "../registro";

interface ParticipantesPanelProps {
  participantes: ParticipanteConectado[];
  cargando: boolean;
  entradas: EntradaRegistro[];
  umbral: number;
}

// Dentro del mismo nivel del semáforo, lo que necesita atención ya arriba.
const PRIORIDAD_ESTADO: Record<EstadoPresencia, number> = {
  desconectado: 0,
  ausente_digital: 1,
  sin_red: 2,
  fuera_de_foco: 3,
  actividad_reducida: 4,
  pantalla_suspendida: 5,
  conectado: 6,
};

const ORDEN_NIVEL: Record<Nivel, number> = { rojo: 0, ambar: 1, verde: 2 };

const CLASE_NIVEL: Record<Nivel, string> = {
  verde: "bg-arena text-carbon",
  ambar: "bg-alerta text-carbon",
  rojo: "bg-error text-arena",
};

const ETIQUETA_NIVEL: Record<Nivel, string> = { verde: "atento", ambar: "a observar", rojo: "necesita atención" };

const CADA_MS = 5000;

// Reloj que avanza cada 5 s: el tiempo fuera de quien sigue distraído
// crece en pantalla sin pedir nada al servidor.
function useAhora(): number {
  const suscribir = useCallback((avisar: () => void) => {
    const id = setInterval(avisar, CADA_MS);
    return () => clearInterval(id);
  }, []);
  return useSyncExternalStore(
    suscribir,
    () => Math.floor(Date.now() / CADA_MS) * CADA_MS,
    () => 0,
  );
}

export function ParticipantesPanel({ participantes, cargando, entradas, umbral }: ParticipantesPanelProps) {
  const ahora = useAhora();
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

  const atencion = atencionPorAlumno(entradas, umbral, ahora);
  const sin = { distracciones: 0, segundosFuera: 0, nivel: "verde" as Nivel };
  const filas = participantes.map((p) => ({ p, a: atencion.get(p.alumnoId) ?? sin }));
  filas.sort(
    (x, y) =>
      ORDEN_NIVEL[x.a.nivel] - ORDEN_NIVEL[y.a.nivel] ||
      y.a.segundosFuera - x.a.segundosFuera ||
      PRIORIDAD_ESTADO[x.p.estadoActual] - PRIORIDAD_ESTADO[y.p.estadoActual],
  );

  return (
    <div className="space-y-3">
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-carbon/65">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-error" /> Más de {umbral} distracciones o 5 min fuera
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-alerta" /> 2 distracciones o 1 min fuera
        </span>
      </p>
      <ul className="grid gap-2 md:grid-cols-2">
        {filas.map(({ p, a }) => (
          <li key={p.alumnoId} className={`${CLASE_FILA} flex items-center gap-3 bg-white p-3 pr-4 shadow-tarjeta`}>
            <span
              title={`Semáforo: ${ETIQUETA_NIVEL[a.nivel]}`}
              className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold ${CLASE_NIVEL[a.nivel]}`}
            >
              {`${p.nombre[0] ?? ""}${p.apellido[0] ?? ""}`.toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-carbon">
                {p.nombre} {p.apellido}
                <span className="sr-only"> — {ETIQUETA_NIVEL[a.nivel]}</span>
              </span>
              <span className="block truncate text-xs text-carbon/60">
                {a.segundosFuera === 0
                  ? "Sin distracciones"
                  : `${a.distracciones} ${a.distracciones === 1 ? "distracción" : "distracciones"} · ${formatoDuracion(a.segundosFuera)} fuera`}
              </span>
            </span>
            <Badge variante={COLOR_ESTADO[p.estadoActual]} punto={p.estadoActual === "conectado" ? "vivo" : true}>
              {ETIQUETA_ESTADO[p.estadoActual]}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
