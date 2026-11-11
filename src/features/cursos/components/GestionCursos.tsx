"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Usuario } from "@/features/auth";
import { Volver } from "@/shared/components/Volver";
import { useCursos } from "../hooks/useCursos";
import type { Curso, PersonaResumen } from "../types";
import { api } from "@/shared/api/client";
import { Boton } from "@/shared/components/Boton";
import { CLASE_CONTROL, Campo } from "@/shared/components/Campo";
import { Icono } from "@/shared/components/Icono";
import { Tarjeta } from "@/shared/components/Tarjeta";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { mensajeDeError } from "@/shared/lib/errores";

// El preceptor solo puede listar alumnos y docentes (no preceptores).
function useUsuariosPorRol(rol: "alumno" | "preceptor" | "docente", enabled: boolean) {
  return useQuery({
    queryKey: ["usuarios", rol],
    queryFn: () =>
      api.get<{ usuarios: Usuario[] }>("/admin/usuarios", { params: { rol } }).then((r) => r.data.usuarios),
    enabled,
  });
}

const iniciales = (p: { nombre: string; apellido?: string }) =>
  `${p.nombre[0] ?? ""}${p.apellido?.[0] ?? ""}`.toUpperCase();
const nombreDe = (u: { nombre: string; apellido?: string }) => `${u.apellido ? `${u.apellido}, ` : ""}${u.nombre}`;

const FORM_ALUMNO_VACIO = { nombre: "", apellido: "", email: "", password: "" };

// Alta de un alumno directo en el curso, con contraseña provisoria que el
// alumno cambia en su primer ingreso. Si el email ya es de un alumno,
// el backend solo lo matricula.
function PrecargarAlumno({ cursoId, onListo }: { cursoId: number; onListo: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(FORM_ALUMNO_VACIO);
  const [aviso, setAviso] = useState<string | null>(null);

  const precargar = useMutation({
    mutationFn: () => api.post<{ creado: boolean }>(`/cursos/${cursoId}/alumnos/nuevo`, form),
    onSuccess: (res) => {
      setAviso(
        res.data.creado
          ? `${form.nombre} quedó cargado. Pasale su email y la contraseña provisoria: la cambia al entrar.`
          : `Ese email ya tenía cuenta de alumno: quedó matriculado con su contraseña de siempre.`,
      );
      setForm(FORM_ALUMNO_VACIO);
      void queryClient.invalidateQueries({ queryKey: ["cursos"] });
      void queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });

  return (
    <form
      className="space-y-3 rounded-2xl border border-dashed border-carbon/15 bg-papel/60 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setAviso(null);
        precargar.mutate();
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-carbon">Cargar un alumno nuevo</h4>
        <button type="button" onClick={onListo} className="text-sm font-medium text-carbon/60 hover:text-carbon">
          Cerrar
        </button>
      </div>
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
        Cargar alumno
      </Boton>
    </form>
  );
}

// US-PC-02: a partir de cuántas distracciones en una clase se avisa al
// docente y a los preceptores del curso.
function UmbralDistracciones({ curso }: { curso: Curso }) {
  const queryClient = useQueryClient();
  const [valor, setValor] = useState(String(curso.umbralDistracciones));
  const guardar = useMutation({
    mutationFn: () => api.patch(`/cursos/${curso.id}`, { umbralDistracciones: Number(valor) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cursos"] }),
  });

  return (
    <Tarjeta className="space-y-3">
      <div>
        <h3 className="font-display text-lg font-bold text-carbon">Alerta de distracciones</h3>
        <p className="text-sm text-carbon/65">
          Se avisa al docente y a preceptoría cuando un alumno se distrae más de esta cantidad de veces en una misma clase.
        </p>
      </div>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          guardar.mutate();
        }}
      >
        <div className="w-24">
          <Campo id={`umbral-${curso.id}`} label="Más de" type="number" min={1} max={50} required
            value={valor} onChange={(e) => setValor(e.target.value)} />
        </div>
        <p className="pb-3 text-sm text-carbon/70">distracciones</p>
        <Boton type="submit" variante="sutil" cargando={guardar.isPending}
          disabled={Number(valor) === curso.umbralDistracciones}>
          Guardar
        </Boton>
        {guardar.isSuccess && Number(valor) === curso.umbralDistracciones && (
          <span className="pb-3 text-sm font-medium text-verde">Guardado</span>
        )}
      </form>
      {guardar.isError && (
        <MensajeEstado tipo="error">{mensajeDeError(guardar.error, "No se pudo guardar el umbral.")}</MensajeEstado>
      )}
    </Tarjeta>
  );
}

// Elegir a alguien que ya tiene cuenta y sumarlo al curso.
function AgregarExistente({
  etiqueta,
  boton,
  disponibles,
  asignados,
  onAgregar,
}: {
  etiqueta: string;
  boton: string;
  disponibles: Usuario[];
  asignados: PersonaResumen[];
  onAgregar: (id: number) => void;
}) {
  const [elegido, setElegido] = useState("");
  const libres = disponibles.filter((u) => u.activo !== false && !asignados.some((a) => a.id === u.id));
  if (libres.length === 0) return null;
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!elegido) return;
        onAgregar(Number(elegido));
        setElegido("");
      }}
    >
      <select aria-label={etiqueta} value={elegido} onChange={(e) => setElegido(e.target.value)} className={`${CLASE_CONTROL} min-w-0`}>
        <option value="">{etiqueta}...</option>
        {libres.map((u) => (
          <option key={u.id} value={u.id}>
            {nombreDe(u)} · {u.email}
          </option>
        ))}
      </select>
      <Boton type="submit" variante="sutil" disabled={!elegido} className="shrink-0">
        {boton}
      </Boton>
    </form>
  );
}

function BotonQuitar({ nombre, onClick }: { nombre: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Quitar a ${nombre} del curso`}
      title="Quitar del curso"
      onClick={onClick}
      className="grid size-9 shrink-0 place-items-center rounded-full text-carbon/40 hover:bg-error/10 hover:text-error focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon"
    >
      <Icono nombre="mas" className="size-4 rotate-45" />
    </button>
  );
}

// Docentes o preceptores del curso: quiénes son y cómo sumar otro.
function Equipo({
  titulo,
  vacio,
  personas,
  disponibles,
  onAgregar,
  onQuitar,
}: {
  titulo: string;
  vacio: string;
  personas: PersonaResumen[];
  disponibles: Usuario[];
  onAgregar: (id: number) => void;
  onQuitar: (id: number) => void;
}) {
  return (
    <Tarjeta className="space-y-4">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-carbon">
        {titulo}
        <span className="rounded-full bg-carbon/[0.06] px-2 font-sans text-xs leading-5 font-semibold tabular-nums">{personas.length}</span>
      </h3>
      {personas.length === 0 ? (
        <p className="text-sm text-carbon/60">{vacio}</p>
      ) : (
        <ul className="space-y-1">
          {personas.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl py-1 pr-1">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-celeste text-xs font-bold text-carbon">
                {iniciales(p)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-carbon">
                  {p.nombre} {p.apellido}
                </span>
                <span className="block truncate text-xs text-carbon/55">{p.email}</span>
              </span>
              <BotonQuitar nombre={`${p.nombre} ${p.apellido}`} onClick={() => onQuitar(p.id)} />
            </li>
          ))}
        </ul>
      )}
      <AgregarExistente
        etiqueta={`Sumar ${titulo.toLowerCase().replace(/s$/, "")}`}
        boton="Sumar"
        disponibles={disponibles}
        asignados={personas}
        onAgregar={onAgregar}
      />
    </Tarjeta>
  );
}

const CAMPO_ID = { preceptores: "preceptorId", docentes: "docenteId", alumnos: "alumnoId" } as const;
type Recurso = keyof typeof CAMPO_ID;

function FichaCurso({ curso, esPreceptor, onVolver }: { curso: Curso; esPreceptor: boolean; onVolver: () => void }) {
  const queryClient = useQueryClient();
  const [cargando, setCargando] = useState(false);
  const preceptores = useUsuariosPorRol("preceptor", !esPreceptor);
  const docentes = useUsuariosPorRol("docente", true);
  const alumnosDisponibles = useUsuariosPorRol("alumno", true);
  const alumnos = useQuery({
    queryKey: ["cursos", curso.id, "alumnos"],
    queryFn: () =>
      api.get<{ alumnos: PersonaResumen[] }>(`/cursos/${curso.id}/alumnos`).then((r) => r.data.alumnos),
  });

  const cambio = useMutation({
    mutationFn: (op: { metodo: "post" | "delete"; recurso: Recurso; id: number }) =>
      op.metodo === "post"
        ? api.post(`/cursos/${curso.id}/${op.recurso}`, { [CAMPO_ID[op.recurso]]: op.id })
        : api.delete(`/cursos/${curso.id}/${op.recurso}/${op.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cursos"] }),
  });
  const agregar = (recurso: Recurso) => (id: number) => cambio.mutate({ metodo: "post", recurso, id });
  const quitar = (recurso: Recurso) => (id: number) => cambio.mutate({ metodo: "delete", recurso, id });
  const lista = alumnos.data ?? [];

  return (
    <div className="entrar space-y-5">
      <Volver onClick={onVolver}>Todos los cursos</Volver>

      <Tarjeta variante="destacada" className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-arena/60 uppercase">
            Curso · {curso.anioLectivo}
            {curso.turno ? ` · ${curso.turno}` : ""}
          </p>
          <h2 className="font-display text-5xl font-bold">{curso.nombre}</h2>
        </div>
        <dl className="flex gap-6 text-arena">
          {(
            [
              ["Alumnos", curso.cantidadAlumnos],
              ["Docentes", curso.docentes.length],
              ["Preceptores", curso.preceptores.length],
            ] as const
          ).map(([etiqueta, valor]) => (
            <div key={etiqueta}>
              <dt className="text-xs text-arena/60">{etiqueta}</dt>
              <dd className="font-display text-3xl font-bold tabular-nums">{valor}</dd>
            </div>
          ))}
        </dl>
      </Tarjeta>

      {cambio.isError && (
        <MensajeEstado tipo="error">{mensajeDeError(cambio.error, "No se pudo guardar el cambio.")}</MensajeEstado>
      )}

      <div className={`grid gap-5 ${esPreceptor ? "" : "md:grid-cols-2"}`}>
        <Equipo
          titulo="Docentes"
          vacio="Sin docentes: nadie puede abrir clases en este curso todavía."
          personas={curso.docentes}
          disponibles={docentes.data ?? []}
          onAgregar={agregar("docentes")}
          onQuitar={quitar("docentes")}
        />
        {!esPreceptor && (
          <Equipo
            titulo="Preceptores"
            vacio="Sin preceptor: nadie recibe las alertas de este curso."
            personas={curso.preceptores}
            disponibles={preceptores.data ?? []}
            onAgregar={agregar("preceptores")}
            onQuitar={quitar("preceptores")}
          />
        )}
      </div>

      <Tarjeta className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-carbon">
            Alumnos
            <span className="rounded-full bg-carbon/[0.06] px-2 font-sans text-xs leading-5 font-semibold tabular-nums">{lista.length}</span>
          </h3>
          {!cargando && (
            <Boton variante="sutil" onClick={() => setCargando(true)}>
              <Icono nombre="mas" className="size-4" />
              Cargar alumno nuevo
            </Boton>
          )}
        </div>
        {cargando && <PrecargarAlumno cursoId={curso.id} onListo={() => setCargando(false)} />}
        <AgregarExistente
          etiqueta="Matricular un alumno que ya tiene cuenta"
          boton="Matricular"
          disponibles={alumnosDisponibles.data ?? []}
          asignados={lista}
          onAgregar={agregar("alumnos")}
        />
        {alumnos.isPending ? (
          <MensajeEstado tipo="cargando">Cargando alumnos...</MensajeEstado>
        ) : lista.length === 0 ? (
          <p className="text-sm text-carbon/60">Todavía no hay alumnos. Cargá el primero o importalos desde el SIE.</p>
        ) : (
          <ol className="gap-x-6 md:columns-2">
            {lista.map((a, i) => (
              <li key={a.id} className="flex break-inside-avoid items-center gap-3 border-b border-carbon/[0.06] py-1.5">
                <span className="w-6 shrink-0 text-right font-mono text-xs text-carbon/45 tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-carbon">
                    {a.apellido}, {a.nombre}
                  </span>
                  <span className="block truncate text-xs text-carbon/50">{a.email}</span>
                </span>
                <BotonQuitar nombre={`${a.nombre} ${a.apellido}`} onClick={() => quitar("alumnos")(a.id)} />
              </li>
            ))}
          </ol>
        )}
      </Tarjeta>

      <UmbralDistracciones curso={curso} />
    </div>
  );
}

function NuevoCurso({ onListo }: { onListo: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ nombre: "", anioLectivo: String(new Date().getFullYear()), turno: "" });
  const crear = useMutation({
    mutationFn: () =>
      api.post("/cursos", {
        nombre: form.nombre,
        anioLectivo: Number(form.anioLectivo),
        ...(form.turno && { turno: form.turno }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cursos"] });
      onListo();
    },
  });
  return (
    <Tarjeta className="entrar">
      <form
        className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          crear.mutate();
        }}
      >
        <Campo id="curso-nombre" label="Nombre (ej. 5° A)" value={form.nombre} required maxLength={100} autoFocus
          onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        <Campo id="curso-anio" label="Año lectivo" type="number" min={2000} max={2100} required
          value={form.anioLectivo} onChange={(e) => setForm({ ...form, anioLectivo: e.target.value })} />
        <Campo id="curso-turno" label="Turno" value={form.turno} maxLength={20} placeholder="Mañana"
          onChange={(e) => setForm({ ...form, turno: e.target.value })} />
        <div className="flex gap-2">
          <Boton type="submit" cargando={crear.isPending}>
            Crear
          </Boton>
          <Boton type="button" variante="sutil" onClick={onListo}>
            Cancelar
          </Boton>
        </div>
      </form>
      {crear.isError && (
        <div className="mt-3">
          <MensajeEstado tipo="error">{mensajeDeError(crear.error, "No se pudo crear el curso.")}</MensajeEstado>
        </div>
      )}
    </Tarjeta>
  );
}

// esPreceptor: solo ve sus cursos (el backend filtra), no asigna
// preceptores y queda asignado a los cursos que crea.
export function GestionCursos({ esPreceptor = false }: { esPreceptor?: boolean }) {
  const cursos = useCursos();
  const [abierto, setAbierto] = useState<number | null>(null);
  const [creando, setCreando] = useState(false);
  const curso = cursos.data?.find((c) => c.id === abierto);

  if (curso) {
    return <FichaCurso curso={curso} esPreceptor={esPreceptor} onVolver={() => setAbierto(null)} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-carbon/65">
          {cursos.data ? `${cursos.data.length} ${cursos.data.length === 1 ? "curso" : "cursos"}` : ""}
        </p>
        {!creando && (
          <Boton onClick={() => setCreando(true)}>
            <Icono nombre="mas" className="size-4" />
            Nuevo curso
          </Boton>
        )}
      </div>
      {creando && <NuevoCurso onListo={() => setCreando(false)} />}

      {cursos.isPending ? (
        <MensajeEstado tipo="cargando">Cargando cursos...</MensajeEstado>
      ) : cursos.isError ? (
        <MensajeEstado tipo="error">No se pudieron cargar los cursos. Recargá la página.</MensajeEstado>
      ) : cursos.data.length === 0 ? (
        <Tarjeta>
          <MensajeEstado tipo="vacio">Todavía no hay cursos. Creá el primero con &quot;Nuevo curso&quot;.</MensajeEstado>
        </Tarjeta>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {cursos.data.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setAbierto(c.id)}
                className="group flex h-full w-full flex-col gap-5 rounded-3xl border border-carbon/[0.07] bg-white p-5 text-left shadow-tarjeta transition-all hover:-translate-y-0.5 hover:border-carbon/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon"
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block font-display text-3xl font-bold text-carbon">{c.nombre}</span>
                    <span className="block text-sm text-carbon/60">
                      {c.anioLectivo}
                      {c.turno ? ` · ${c.turno}` : ""}
                    </span>
                  </span>
                  <Icono nombre="flecha" className="size-5 text-carbon/30 transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="mt-auto grid grid-cols-3 gap-2 text-carbon">
                  {(
                    [
                      ["alumnos", c.cantidadAlumnos],
                      ["docentes", c.docentes.length],
                      ["preceptores", c.preceptores.length],
                    ] as const
                  ).map(([etiqueta, valor]) => (
                    <span key={etiqueta} className={`rounded-2xl px-3 py-2 ${valor === 0 ? "bg-alerta/15" : "bg-papel"}`}>
                      <span className="block font-display text-xl font-bold tabular-nums">{valor}</span>
                      <span className="block text-xs text-carbon/60">{etiqueta}</span>
                    </span>
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
