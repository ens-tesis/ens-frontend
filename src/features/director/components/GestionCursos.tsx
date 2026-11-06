"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Usuario } from "@/features/auth";
import { useCursos, type Curso, type PersonaResumen } from "@/features/reportes";
import { api } from "@/shared/api/client";
import { Boton } from "@/shared/components/Boton";
import { CLASE_CONTROL, Campo } from "@/shared/components/Campo";
import { Icono } from "@/shared/components/Icono";
import { CLASE_FILA, Tarjeta } from "@/shared/components/Tarjeta";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { mensajeDeError } from "@/shared/lib/errores";


// /admin/usuarios es solo de dirección: el preceptor no lo consulta.
function useUsuariosPorRol(rol: "alumno" | "preceptor", enabled: boolean) {
  return useQuery({
    queryKey: ["usuarios", rol],
    queryFn: () =>
      api.get<{ usuarios: Usuario[] }>("/admin/usuarios", { params: { rol } }).then((r) => r.data.usuarios),
    enabled,
  });
}

const FORM_ALUMNO_VACIO = { nombre: "", apellido: "", email: "", password: "" };

// Alta de un alumno directo en el curso, con contraseña provisoria que el
// alumno cambia en su primer ingreso. Si el email ya es de un alumno,
// el backend solo lo matricula.
function PrecargarAlumno({ cursoId }: { cursoId: number }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(FORM_ALUMNO_VACIO);
  const [aviso, setAviso] = useState<string | null>(null);

  const precargar = useMutation({
    mutationFn: () => api.post<{ creado: boolean }>(`/cursos/${cursoId}/alumnos/nuevo`, form),
    onSuccess: (res) => {
      setAviso(
        res.data.creado
          ? `Alumno creado. Pasale su email y la contraseña provisoria: la cambia al entrar.`
          : `Ese email ya tenía cuenta de alumno: quedó matriculado con su contraseña de siempre.`,
      );
      setForm(FORM_ALUMNO_VACIO);
      void queryClient.invalidateQueries({ queryKey: ["cursos"] });
    },
  });

  return (
    <form
      className="space-y-3 rounded-2xl bg-papel/60 p-4 md:col-span-2"
      onSubmit={(e) => {
        e.preventDefault();
        setAviso(null);
        precargar.mutate();
      }}
    >
      <h4 className="text-sm font-semibold text-carbon">Precargar alumno</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo id={`alumno-nombre-${cursoId}`} label="Nombre" required value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <Campo id={`alumno-apellido-${cursoId}`} label="Apellido" value={form.apellido}
          onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
        <Campo id={`alumno-email-${cursoId}`} label="Email" type="email" required autoComplete="off"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Campo id={`alumno-password-${cursoId}`} label="Contraseña provisoria (mín. 8)" type="text"
          required minLength={8} autoComplete="off" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </div>
      {precargar.isError && (
        <MensajeEstado tipo="error">{mensajeDeError(precargar.error, "No se pudo cargar el alumno.")}</MensajeEstado>
      )}
      {aviso && <MensajeEstado tipo="exito">{aviso}</MensajeEstado>}
      <Boton type="submit" cargando={precargar.isPending}>
        Agregar alumno
      </Boton>
    </form>
  );
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
  // Sin lista (preceptor) no se muestra el "agregar existente".
  disponibles: Usuario[] | null;
  onAgregar: (id: number) => void;
  onQuitar: (id: number) => void;
  error: string | null;
}) {
  const [elegido, setElegido] = useState("");
  const libres = (disponibles ?? []).filter(
    (u) => u.activo !== false && !asignados.some((a) => a.id === u.id),
  );
  return (
    <div className="space-y-3">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-carbon">
        {titulo}
        <span className="rounded-full bg-carbon/[0.06] px-2 text-xs leading-5 tabular-nums">{asignados.length}</span>
      </h4>
      {asignados.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {asignados.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-1 rounded-full border border-carbon/10 bg-white py-1 pr-1 pl-3 text-sm text-carbon"
            >
              <span>{nombreDe(a)}</span>
              <button
                type="button"
                aria-label={`Quitar a ${nombreDe(a)}`}
                onClick={() => onQuitar(a.id)}
                className="grid size-7 place-items-center rounded-full text-carbon/50 hover:bg-error/10 hover:text-error focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon"
              >
                <Icono nombre="mas" className="size-4 rotate-45" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {disponibles && <form
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
          className={CLASE_CONTROL}
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
      </form>}
      {error && <MensajeEstado tipo="error">{error}</MensajeEstado>}
    </div>
  );
}

function DetalleCurso({ curso, esPreceptor }: { curso: Curso; esPreceptor: boolean }) {
  const queryClient = useQueryClient();
  const preceptores = useUsuariosPorRol("preceptor", !esPreceptor);
  const alumnosDisponibles = useUsuariosPorRol("alumno", !esPreceptor);
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
    <div className="grid gap-6 border-t border-carbon/[0.07] p-4 sm:p-5 md:grid-cols-2">
      {!esPreceptor && (
        <Asignaciones
          titulo="Preceptores"
          asignados={curso.preceptores}
          disponibles={preceptores.data ?? []}
          onAgregar={(id) => cambio.mutate({ metodo: "post", recurso: "preceptores", id })}
          onQuitar={(id) => cambio.mutate({ metodo: "delete", recurso: "preceptores", id })}
          error={cambio.variables?.recurso === "preceptores" ? error : null}
        />
      )}
      <Asignaciones
        titulo="Alumnos"
        asignados={alumnos.data ?? []}
        disponibles={esPreceptor ? null : (alumnosDisponibles.data ?? [])}
        onAgregar={(id) => cambio.mutate({ metodo: "post", recurso: "alumnos", id })}
        onQuitar={(id) => cambio.mutate({ metodo: "delete", recurso: "alumnos", id })}
        error={cambio.variables?.recurso === "alumnos" ? error : null}
      />
      <PrecargarAlumno cursoId={curso.id} />
    </div>
  );
}

// esPreceptor: solo ve sus cursos (el backend filtra), no asigna
// preceptores y queda asignado a los cursos que crea.
export function GestionCursos({ esPreceptor = false }: { esPreceptor?: boolean }) {
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
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      <form
        className="order-first space-y-4 rounded-3xl border border-carbon/[0.07] bg-white p-5 shadow-tarjeta sm:p-6 lg:sticky lg:top-24 lg:order-last"
        onSubmit={(e) => {
          e.preventDefault();
          crear.mutate();
        }}
      >
        <h2 className="font-display text-xl font-bold text-carbon">Nuevo curso</h2>
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

      <div className="space-y-2">
        {cursos.isPending ? (
          <MensajeEstado tipo="cargando">Cargando cursos...</MensajeEstado>
        ) : cursos.isError ? (
          <MensajeEstado tipo="error">No se pudieron cargar los cursos.</MensajeEstado>
        ) : cursos.data.length === 0 ? (
          <Tarjeta>
            <MensajeEstado tipo="vacio">Todavía no hay cursos. Creá el primero con el formulario.</MensajeEstado>
          </Tarjeta>
        ) : (
          cursos.data.map((c) => (
            <div key={c.id} className={`${CLASE_FILA} overflow-hidden bg-white shadow-tarjeta`}>
              <button
                type="button"
                aria-expanded={abierto === c.id}
                onClick={() => setAbierto(abierto === c.id ? null : c.id)}
                className="flex min-h-16 w-full items-center gap-4 px-4 py-3 text-left hover:bg-papel/50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-carbon"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-celeste font-display text-sm font-bold text-carbon">
                  {c.nombre.slice(0, 3)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-carbon">
                    {c.nombre}
                    <span className="font-normal text-carbon/55">
                      {" "}
                      · {c.anioLectivo}
                      {c.turno ? ` · ${c.turno}` : ""}
                    </span>
                  </span>
                  <span className="block text-xs text-carbon/60">
                    {c.cantidadAlumnos} alumnos · {c.preceptores.length} preceptores
                  </span>
                </span>
                <Icono
                  nombre="flecha"
                  className={`size-5 shrink-0 text-carbon/40 transition-transform ${abierto === c.id ? "rotate-90" : ""}`}
                />
              </button>
              {abierto === c.id && <DetalleCurso curso={c} esPreceptor={esPreceptor} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
