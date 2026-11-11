"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useCursos } from "@/features/reportes";
import { api } from "@/shared/api/client";
import { Badge } from "@/shared/components/Badge";
import { Boton } from "@/shared/components/Boton";
import { CLASE_CONTROL, CLASE_ETIQUETA, Campo } from "@/shared/components/Campo";
import { Icono } from "@/shared/components/Icono";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { Tarjeta } from "@/shared/components/Tarjeta";
import { mensajeDeError } from "@/shared/lib/errores";

interface ResultadoFila {
  fila: number;
  alumno: string;
  email: string | null;
  curso: string | null;
  estado: "creado" | "existente" | "error";
  error?: string;
}

interface Resultado {
  total: number;
  creados: number;
  existentes: number;
  fallidos: number;
  cursosCreados: string[];
  filas: ResultadoFila[];
}

const ESTADO: Record<ResultadoFila["estado"], { texto: string; variante: "verde" | "celeste" | "rojo" }> = {
  creado: { texto: "Nuevo", variante: "verde" },
  existente: { texto: "Ya existía", variante: "celeste" },
  error: { texto: "Error", variante: "rojo" },
};

// Lo que reconoce el importador (ver csvSie.ts en el backend).
const COLUMNAS_OBLIGATORIAS = ["Nombre (o \"Apellido y Nombre\")", "DNI o Email"];
const COLUMNAS_OPCIONALES = ["Apellido", "Email", "Curso", "Año + División", "Turno"];

// Excel en español guarda los CSV en Windows-1252, no en UTF-8: si el
// archivo no es UTF-8 válido se relee así, para no romper las tildes.
async function leerTexto(archivo: File): Promise<string> {
  const bytes = await archivo.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

function Resultados({ r }: { r: Resultado }) {
  const filas = [...r.filas].sort((a, b) => Number(b.estado === "error") - Number(a.estado === "error"));
  const datos: [string, number, string][] = [
    ["Nuevos", r.creados, "text-verde"],
    ["Ya existían", r.existentes, "text-carbon"],
    ["Con error", r.fallidos, r.fallidos ? "text-error" : "text-carbon/40"],
  ];
  return (
    <div className="entrar space-y-4">
      <dl className="grid grid-cols-3 overflow-hidden rounded-3xl border border-carbon/[0.07] bg-white shadow-tarjeta">
        {datos.map(([etiqueta, valor, color], i) => (
          <div key={etiqueta} className={`px-5 py-4 ${i > 0 ? "border-l border-carbon/[0.07]" : ""}`}>
            <dt className="text-xs font-medium text-carbon/60">{etiqueta}</dt>
            <dd className={`mt-1 font-display text-3xl font-bold tabular-nums ${color}`}>{valor}</dd>
          </div>
        ))}
      </dl>
      {r.cursosCreados.length > 0 && (
        <MensajeEstado tipo="info">
          Se crearon {r.cursosCreados.length === 1 ? "el curso" : "los cursos"} {r.cursosCreados.join(", ")}: asignales
          docentes y preceptor desde Cursos.
        </MensajeEstado>
      )}
      <Tarjeta className="p-0 sm:p-0">
        <ul className="divide-y divide-carbon/[0.06]">
          {filas.map((f) => (
            <li key={f.fila} className="flex items-center gap-3 px-5 py-2.5 text-sm">
              <span className="w-12 shrink-0 font-mono text-xs text-carbon/45 tabular-nums">fila {f.fila}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-carbon">{f.alumno}</span>
                <span className={`block truncate text-xs ${f.estado === "error" ? "text-error" : "text-carbon/60"}`}>
                  {f.estado === "error" ? f.error : [f.email, f.curso].filter(Boolean).join(" · ")}
                </span>
              </span>
              <Badge variante={ESTADO[f.estado].variante}>{ESTADO[f.estado].texto}</Badge>
            </li>
          ))}
        </ul>
      </Tarjeta>
    </div>
  );
}

// Alta masiva de alumnos desde el CSV exportado del SIE (US-DI-02).
export function ImportarSie() {
  const queryClient = useQueryClient();
  const cursos = useCursos();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [cursoId, setCursoId] = useState("");
  const [password, setPassword] = useState("");

  const importar = useMutation({
    mutationFn: async () => {
      const contenido = await leerTexto(archivo!);
      const res = await api.post<Resultado>("/cursos/importar-sie", {
        archivoNombre: archivo!.name,
        contenido,
        ...(cursoId && { cursoId: Number(cursoId) }),
        ...(password && { passwordProvisoria: password }),
      });
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cursos"] });
      void queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });

  function elegir(f: File | undefined): void {
    setArchivo(f ?? null);
    importar.reset();
  }

  return (
    <div className="space-y-5">
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_18rem]">
        <Tarjeta>
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (archivo) importar.mutate();
            }}
          >
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={(e) => {
                e.preventDefault();
                setArrastrando(false);
                elegir(e.dataTransfer.files[0]);
              }}
              className={`flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-6 py-10 text-center transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-carbon ${
                arrastrando ? "border-violeta bg-violeta/10" : archivo ? "border-verde/40 bg-verde/[0.04]" : "border-carbon/15 bg-papel/60 hover:border-carbon/30"
              }`}
            >
              <span className={`grid size-12 place-items-center rounded-2xl ${archivo ? "bg-verde text-arena" : "bg-celeste text-carbon"}`}>
                <Icono nombre={archivo ? "asistencia" : "descargar"} className={`size-5 ${archivo ? "" : "rotate-180"}`} />
              </span>
              {archivo ? (
                <>
                  <span className="max-w-full truncate font-semibold text-carbon">{archivo.name}</span>
                  <span className="text-sm text-carbon/60">Listo para importar · tocá para elegir otro</span>
                </>
              ) : (
                <>
                  <span className="font-semibold text-carbon">Arrastrá acá el CSV del SIE</span>
                  <span className="text-sm text-carbon/60">o tocá para elegirlo de tu computadora</span>
                </>
              )}
              <input
                type="file"
                accept=".csv,text/csv"
                required
                onChange={(e) => elegir(e.target.files?.[0])}
                className="sr-only"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className={CLASE_ETIQUETA}>Curso, si el archivo no lo trae</span>
                <select value={cursoId} onChange={(e) => setCursoId(e.target.value)} className={CLASE_CONTROL}>
                  <option value="">El que diga el archivo</option>
                  {(cursos.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} · {c.anioLectivo}
                    </option>
                  ))}
                </select>
              </label>
              <Campo id="sie-password" label="Contraseña provisoria" placeholder="Vacío = su DNI" type="text" minLength={8}
                autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            {importar.isError && (
              <MensajeEstado tipo="error">{mensajeDeError(importar.error, "No se pudo importar el archivo.")}</MensajeEstado>
            )}
            <Boton type="submit" cargando={importar.isPending} disabled={!archivo} className="w-full sm:w-auto">
              Importar alumnos
            </Boton>
          </form>
        </Tarjeta>

        <aside className="space-y-4 rounded-3xl border border-carbon/[0.08] bg-papel p-5 text-sm text-carbon/75">
          <h3 className="font-display text-lg font-bold text-carbon">Qué tiene que traer</h3>
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wide text-carbon/55 uppercase">Obligatorio</p>
            <ul className="flex flex-wrap gap-1.5">
              {COLUMNAS_OBLIGATORIAS.map((c) => (
                <li key={c} className="rounded-full bg-verde px-2.5 py-1 text-xs font-semibold text-arena">
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wide text-carbon/55 uppercase">Si está, se usa</p>
            <ul className="flex flex-wrap gap-1.5">
              {COLUMNAS_OPCIONALES.map((c) => (
                <li key={c} className="rounded-full border border-carbon/15 bg-white px-2.5 py-1 text-xs font-medium text-carbon">
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <ul className="space-y-2 border-t border-carbon/10 pt-4 leading-relaxed">
            <li>Las columnas pueden venir en cualquier orden.</li>
            <li>
              Sin email, el alumno entra con <span className="font-mono text-xs">DNI@alumnos.ens</span>.
            </li>
            <li>Todos cambian la contraseña la primera vez que entran.</li>
            <li>Importar el mismo archivo otra vez no duplica alumnos.</li>
          </ul>
        </aside>
      </div>

      {importar.data && <Resultados r={importar.data} />}
    </div>
  );
}
