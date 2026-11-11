import { CLASE_CONTROL, CLASE_ETIQUETA } from "./Campo";

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

export function FiltroPeriodo({ valor, onChange }: { valor: Periodo; onChange: (p: Periodo) => void }) {
  return (
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
  );
}
