import type { ReactNode } from "react";
import { BotonInstalar } from "@/shared/pwa/BotonInstalar";

// Muestra de cómo se ve una clase en el ENS: lo que hace el producto,
// dicho con sus propios estados en vez de con un slogan.
const MUESTRA = [
  { nombre: "Valentina R.", estado: "Conectada", punto: "bg-celeste latido text-celeste" },
  { nombre: "Tomás G.", estado: "Fuera de foco", punto: "bg-violeta" },
  { nombre: "Martina L.", estado: "Sin red", punto: "bg-alerta" },
];

// Layout de login y registro: pizarrón con la marca a la izquierda en
// desktop, banda superior en mobile; el formulario en el resto.
export function PantallaAuth({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:flex-row">
      <section className="pizarron relative flex flex-col justify-between gap-8 overflow-hidden rounded-b-[2rem] px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-8 text-arena lg:w-[46%] lg:rounded-none lg:p-12">
        <span className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-xl bg-violeta font-display text-lg font-bold text-carbon"
          >
            e
          </span>
          <span className="leading-tight">
            <span className="block font-display text-xl font-bold">ENS</span>
            <span className="block text-xs text-arena/65">Entorno de Navegación Supervisado</span>
          </span>
        </span>

        <div className="space-y-8">
          <p className="max-w-md font-display text-3xl leading-[1.05] font-bold sm:text-4xl lg:text-6xl">
            Internet en el aula, sin perder a nadie de vista.
          </p>
          <ul aria-hidden="true" className="hidden max-w-sm space-y-2 lg:block">
            {MUESTRA.map((m, i) => (
              <li
                key={m.nombre}
                className="flex items-center justify-between rounded-2xl bg-arena/[0.08] px-4 py-3 text-sm"
                style={{ marginLeft: `${i * 1.25}rem` }}
              >
                <span className="font-semibold">{m.nombre}</span>
                <span className="flex items-center gap-2 text-arena/75">
                  <span className={`size-2 rounded-full ${m.punto}`} />
                  {m.estado}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="hidden text-xs text-arena/50 lg:block">Piloto · Colegio Santa María, Mendoza</p>
      </section>

      <main className="flex flex-1 justify-center px-5 py-10 sm:px-8 lg:items-center">
        <div className="entrar w-full max-w-sm space-y-6">
          <h1 className="font-display text-3xl font-bold text-carbon">{titulo}</h1>
          {children}
          <BotonInstalar className="mx-auto" />
        </div>
      </main>
    </div>
  );
}
