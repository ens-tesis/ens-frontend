import { CLASE_CONTROL, CLASE_ETIQUETA } from "./Campo";
import { ATAJOS_PERIODO, atajoActivo, periodoDeAtajo } from "../lib/periodo";

// Fechas AAAA-MM-DD; vacío = sin límite de ese lado.
export interface Periodo {
  desde: string;
  hasta: string;
}

export const PERIODO_VACIO: Periodo = { desde: "", hasta: "" };

// Solo las fechas cargadas, listas para mandar como query params.
export function paramsDePeriodo(periodo: Periodo): Partial<Periodo> {
  return {
    ...(periodo.desde && { desde: periodo.desde }),
    ...(periodo.hasta && { hasta: periodo.hasta }),
  };
}

// Atajos (semana, mes, cuatrimestre, año lectivo) que completan las fechas;
// tocar el atajo activo lo quita. Las fechas siguen editables a mano.
export function FiltroPeriodo({ valor, onChange }: { valor: Periodo; onChange: (p: Periodo) => void }) {
  const activo = atajoActivo(valor);
  return (
    <div className="space-y-2">
      <div role="group" aria-label="Período" className="flex flex-wrap gap-1.5">
        {ATAJOS_PERIODO.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-pressed={a.id === activo}
            onClick={() => onChange(a.id === activo ? PERIODO_VACIO : periodoDeAtajo(a.id))}
            className={`min-h-8 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon ${
              a.id === activo ? "bg-carbon text-arena" : "bg-carbon/[0.06] text-carbon/70 hover:text-carbon"
            }`}
          >
            {a.etiqueta}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(["desde", "hasta"] as const).map((campo) => (
          <label key={campo} className="space-y-1.5">
            <span className={`${CLASE_ETIQUETA} capitalize`}>{campo}</span>
            <input
              type="date"
              value={valor[campo]}
              onChange={(e) => onChange({ ...valor, [campo]: e.target.value })}
              className={CLASE_CONTROL}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
