// Atajos del filtro de período (US-DI-01, US-PC-01): semana, mes,
// cuatrimestre y año lectivo, siempre hasta hoy. Ciclo lectivo de Mendoza:
// 1.º cuatrimestre marzo–julio, 2.º agosto–diciembre; en enero y febrero
// (receso) cuentan el 2.º cuatrimestre y el año lectivo anteriores.

export type AtajoPeriodo = "semana" | "mes" | "cuatrimestre" | "anio";

export const ATAJOS_PERIODO: { id: AtajoPeriodo; etiqueta: string }[] = [
  { id: "semana", etiqueta: "Semana" },
  { id: "mes", etiqueta: "Mes" },
  { id: "cuatrimestre", etiqueta: "Cuatrimestre" },
  { id: "anio", etiqueta: "Año lectivo" },
];

// AAAA-MM-DD en hora local (toISOString pasaría a UTC y correría el día).
function fecha(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function periodoDeAtajo(atajo: AtajoPeriodo, hoy = new Date()): { desde: string; hasta: string } {
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth(); // 0 = enero
  const receso = mes < 2;
  let desde: Date;
  switch (atajo) {
    case "semana":
      // getDay(): 0 = domingo; la semana arranca el lunes.
      desde = new Date(anio, mes, hoy.getDate() - ((hoy.getDay() + 6) % 7));
      break;
    case "mes":
      desde = new Date(anio, mes, 1);
      break;
    case "cuatrimestre":
      desde = receso ? new Date(anio - 1, 7, 1) : new Date(anio, mes < 7 ? 2 : 7, 1);
      break;
    case "anio":
      desde = new Date(receso ? anio - 1 : anio, 2, 1);
      break;
  }
  return { desde: fecha(desde), hasta: fecha(hoy) };
}

// Qué atajo coincide con el período elegido (para resaltar el botón).
export function atajoActivo(periodo: { desde: string; hasta: string }, hoy = new Date()): AtajoPeriodo | null {
  return (
    ATAJOS_PERIODO.find(({ id }) => {
      const p = periodoDeAtajo(id, hoy);
      return p.desde === periodo.desde && p.hasta === periodo.hasta;
    })?.id ?? null
  );
}
