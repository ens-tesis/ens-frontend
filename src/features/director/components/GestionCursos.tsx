"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Usuario } from "@/features/auth";
import { useCursos, type Curso, type PersonaResumen } from "@/features/reportes";
import { api } from "@/shared/api/client";
import { Boton } from "@/shared/components/Boton";
import { Campo } from "@/shared/components/Campo";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { mensajeDeError } from "@/shared/lib/errores";

const CLASE_SELECT =
  "min-h-11 w-full rounded-lg border border-carbon/20 bg-arena px-3.5 py-2.5 text-base text-carbon";

function useUsuariosPorRol(rol: "alumno" | "preceptor") {
  return useQuery({
    queryKey: ["usuarios", rol],
    queryFn: () =>
      api.get<{ usuarios: Usuario[] }>("/admin/usuarios", { params: { rol } }).then((r) => r.data.usuarios),
  });
}

function nombreDe(u: { nombre: string; apellido?: string }) {
  return `${u.apellido ? `${u.apellido}, ` : ""}${u.nombre}`;
}

// Lista + "agregar" para preceptores o alumnos de un curso.
function Asignaciones({
  titulo,
  asignados,
  disponibles,
  onAgregar,
  onQuitar,
  error,
}: {
  titulo: string;
  asignados: PersonaResumen[];
  disponibles: Usuario[];
  onAgregar: (id: number) => void;
  onQuitar: (id: number) => void;
  error: string | null;
}) {
  const [elegido, setElegido] = useState("");
  const libres = disponibles.filter((u) => u.activo !== false && !asignados.some((a) => a.id === u.id));
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-carbon">
        {titulo} ({asignados.length})
      </h4>
      {asignados.length > 0 && (
        <ul className="space-y-1">
          {asignados.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 text-sm text-carbon">
              <span>{nombreDe(a)}</span>
              <button
                type="button"
                onClick={() => onQuitar(a.id)}
                className="min-h-9 px-2 text-xs font-medium text-error underline underline-offset-2"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!elegido) return;
          onAgregar(Number(elegido));
          setElegido("");
        }}
      >
        <select
          aria-label={`Agregar a ${titulo.toLowerCase()}`}
          value={elegido}
          onChange={(e) => setElegido(e.target.value)}
          className={CLASE_SELECT}
        >
          <option value="">Elegir...</option>
          {libres.map((u) => (
            <option key={u.id} value={u.id}>
              {nombreDe(u)} · {u.email}
            </option>
          ))}
        </select>
        <Boton type="submit" disabled={!elegido}>
          Agregar
        </Boton>
      </form>
      {error && <MensajeEstado tipo="error">{error}</MensajeEstado>}
    </div>
  );
}

function DetalleCurso({ curso }: { curso: Curso }) {
  const queryClient = useQueryClient();
  const preceptores = useUsuariosPorRol("preceptor");
  const alumnosDisponibles = useUsuariosPorRol("alumno");
  const alumnos = useQuery({
    queryKey: ["cursos", curso.id, "alumnos"],
    queryFn: () =>
      api.get<{ alumnos: PersonaResumen[] }>(`/cursos/${curso.id}/alumnos`).then((r) => r.data.alumnos),
  });

  const cambio = useMutation({
    mutationFn: (op: { metodo: "post" | "delete"; recurso: "preceptores" | "alumnos"; id: number }) =>
      op.metodo === "post"
        ? api.post(`/cursos/${curso.id}/${op.recurso}`, op.recurso === "alumnos" ? { alumnoId: op.id } : { preceptorId: op.id })
        : api.delete(`/cursos/${curso.id}/${op.recurso}/${op.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cursos"] }),
  });
  const error = cambio.isError ? mensajeDeError(cambio.error, "No se pudo guardar el cambio.") : null;

  return (
    <div className="space-y-5 border-t border-carbon/10 px-4 py-4">
      <Asignaciones
        titulo="Preceptores"
        asignados={curso.preceptores}
        disponibles={preceptores.data ?? []}
        onAgregar={(id) => cambio.mutate({ metodo: "post", recurso: "preceptores", id })}
        onQuitar={(id) => cambio.mutate({ metodo: "delete", recurso: "preceptores", id })}
        error={cambio.variables?.recurso === "preceptores" ? error : null}
      />
      <Asignaciones
        titulo="Alumnos"
        asignados={alumnos.data ?? []}
        disponibles={alumnosDisponibles.data ?? []}
        onAgregar={(id) => cambio.mutate({ metodo: "post", recurso: "alumnos", id })}
        onQuitar={(id) => cambio.mutate({ metodo: "delete", recurso: "alumnos", id })}
        error={cambio.variables?.recurso === "alumnos" ? error : null}
      />
    </div>
  );
}

export function GestionCursos() {
  const queryClient = useQueryClient();
  const cursos = useCursos();
  const [abierto, setAbierto] = useState<number | null>(null);
  const [form, setForm] = useState({ nombre: "", anioLectivo: String(new Date().getFullYear()), turno: "" });

  const crear = useMutation({
    mutationFn: () =>
      api.post("/cursos", {
        nombre: form.nombre,
        anioLectivo: Number(form.anioLectivo),
        ...(form.turno && { turno: form.turno }),
      }),
    onSuccess: () => {
      setForm({ ...form, nombre: "", turno: "" });
      void queryClient.invalidateQueries({ queryKey: ["cursos"] });
    },
  });

  return (
    <div className="space-y-6">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          crear.mutate();
        }}
      >
        <h2 className="text-lg font-semibold text-carbon">Nuevo curso</h2>
        <Campo id="curso-nombre" label="Nombre (ej. 5to A)" value={form.nombre} required maxLength={100}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Campo id="curso-anio" label="Año lectivo" type="number" min={2000} max={2100} required
            value={form.anioLectivo} onChange={(e) => setForm({ ...form, anioLectivo: e.target.value })} />
          <Campo id="curso-turno" label="Turno" value={form.turno} maxLength={20}
            onChange={(e) => setForm({ ...form, turno: e.target.value })} />
        </div>
        {crear.isError && <MensajeEstado tipo="error">{mensajeDeError(crear.error, "No se pudo crear el curso.")}</MensajeEstado>}
        <Boton type="submit" cargando={crear.isPending} className="w-full">
          Crear curso
        </Boton>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-carbon">Cursos</h2>
        {cursos.isPending ? (
          <MensajeEstado tipo="cargando">Cargando cursos...</MensajeEstado>
        ) : cursos.isError ? (
          <MensajeEstado tipo="error">No se pudieron cargar los cursos.</MensajeEstado>
        ) : cursos.data.length === 0 ? (
          <MensajeEstado tipo="vacio">Todavía no hay cursos.</MensajeEstado>
        ) : (
          cursos.data.map((c) => (
            <div key={c.id} className="rounded-lg border border-carbon/10 bg-arena">
              <button
                type="button"
                aria-expanded={abierto === c.id}
                onClick={() => setAbierto(abierto === c.id ? null : c.id)}
                className="flex min-h-11 w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left"
              >
                <span className="font-medium text-carbon">
                  {c.nombre} · {c.anioLectivo}
                  {c.turno ? ` · ${c.turno}` : ""}
                </span>
                <span className="text-sm text-carbon/70">
                  {c.cantidadAlumnos} alumnos · {c.preceptores.length} preceptores
                </span>
              </button>
              {abierto === c.id && <DetalleCurso curso={c} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
