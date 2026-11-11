"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useGuardRol } from "@/features/auth";
import { GestionCursos } from "@/features/director";
import { NotificacionesCampana } from "@/features/notificaciones";
import { Asistencia, Historial, HistorialAlumno, useCursos, type Curso, type PersonaResumen } from "@/features/reportes";
import { api } from "@/shared/api/client";
import { AppShell, PantallaCargando, type ItemNav } from "@/shared/components/AppShell";
import { Icono } from "@/shared/components/Icono";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { CLASE_FILA, Tarjeta } from "@/shared/components/Tarjeta";

type Seccion = "asistencia" | "historial" | "cursos" | "gestion" | "alta";

const SECCIONES: (ItemNav<Seccion> & { descripcion: string })[] = [
  {
    id: "asistencia",
    etiqueta: "Asistencia",
    icono: "asistencia",
    descripcion: "Por clase: quién se conectó, quién faltó y quién llegó tarde o no se quedó conectado.",
  },
  {
    id: "historial",
    etiqueta: "Historial",
    icono: "historial",
    descripcion: "Las clases de tus cursos: quién estuvo, quién se distrajo y quién perdió la conexión.",
  },
  {
    id: "cursos",
    etiqueta: "Mis cursos",
    icono: "cursos",
    descripcion: "Elegí un alumno para ver su asistencia digital en todas las clases.",
  },
  {
    id: "gestion",
    etiqueta: "Gestionar cursos",
    icono: "alumnos",
    descripcion: "Creá cursos y precargá a sus alumnos con una contraseña provisoria.",
  },
  { id: "alta", etiqueta: "Alta docente", icono: "alta", href: "/admin", descripcion: "" },
];

function AlumnosDelCurso({
  curso,
  onAlumno,
}: {
  curso: Curso;
  onAlumno: (a: PersonaResumen) => void;
}) {
  const alumnos = useQuery({
    queryKey: ["cursos", curso.id, "alumnos"],
    queryFn: () =>
      api.get<{ alumnos: PersonaResumen[] }>(`/cursos/${curso.id}/alumnos`).then((r) => r.data.alumnos),
  });
  if (alumnos.isPending) return <MensajeEstado tipo="cargando">Cargando alumnos...</MensajeEstado>;
  if (alumnos.isError) return <MensajeEstado tipo="error">No se pudieron cargar los alumnos.</MensajeEstado>;
  if (alumnos.data.length === 0) return <MensajeEstado tipo="vacio">Sin alumnos matriculados.</MensajeEstado>;
  return (
    <ul className="grid gap-1 sm:grid-cols-2">
      {alumnos.data.map((a) => (
        <li key={a.id}>
          <button
            type="button"
            onClick={() => onAlumno(a)}
            className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left text-sm text-carbon hover:bg-papel focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-arena text-xs font-bold">
              {`${a.nombre[0] ?? ""}${a.apellido[0] ?? ""}`.toUpperCase()}
            </span>
            <span className="flex-1 truncate">
              {a.apellido}, {a.nombre}
            </span>
            <Icono nombre="flecha" className="size-4 text-carbon/40" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function PreceptorView() {
  const { cargando, usuario } = useGuardRol(["preceptor"]);
  const cursos = useCursos(Boolean(usuario));
  const [seccion, setSeccion] = useState<Seccion>("asistencia");
  const [cursoAbierto, setCursoAbierto] = useState<number | null>(null);
  const [alumno, setAlumno] = useState<PersonaResumen | null>(null);

  if (cargando) return <PantallaCargando />;
  if (!usuario) return null;

  const actual = SECCIONES.find((s) => s.id === seccion)!;

  return (
    <AppShell
      area="Preceptoría"
      usuario={usuario}
      secciones={SECCIONES}
      activa={seccion}
      onCambiar={(s) => {
        setSeccion(s);
        setAlumno(null);
      }}
      titulo={actual.etiqueta}
      descripcion={actual.descripcion}
      acciones={<NotificacionesCampana />}
    >
      {seccion === "gestion" ? (
        <GestionCursos esPreceptor />
      ) : cursos.isPending ? (
        <MensajeEstado tipo="cargando">Cargando cursos...</MensajeEstado>
      ) : cursos.isError ? (
        <MensajeEstado tipo="error">No se pudieron cargar tus cursos.</MensajeEstado>
      ) : cursos.data.length === 0 ? (
        <Tarjeta>
          <MensajeEstado tipo="vacio">
            Todavía no tenés cursos. Creá uno en &quot;Gestionar cursos&quot; o pedile a la dirección que te asigne.
          </MensajeEstado>
        </Tarjeta>
      ) : seccion === "asistencia" ? (
        <Asistencia cursos={cursos.data} />
      ) : seccion === "historial" ? (
        <Historial cursos={cursos.data} />
      ) : alumno ? (
        <HistorialAlumno
          alumnoId={alumno.id}
          nombre={`${alumno.nombre} ${alumno.apellido}`}
          onVolver={() => setAlumno(null)}
        />
      ) : (
        <div className="space-y-2">
          {cursos.data.map((c) => (
            <div key={c.id} className={`${CLASE_FILA} overflow-hidden bg-white shadow-tarjeta`}>
              <button
                type="button"
                aria-expanded={cursoAbierto === c.id}
                onClick={() => setCursoAbierto(cursoAbierto === c.id ? null : c.id)}
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
                  <span className="block text-xs text-carbon/60">{c.cantidadAlumnos} alumnos</span>
                </span>
                <Icono
                  nombre="flecha"
                  className={`size-5 shrink-0 text-carbon/40 transition-transform ${cursoAbierto === c.id ? "rotate-90" : ""}`}
                />
              </button>
              {cursoAbierto === c.id && (
                <div className="border-t border-carbon/[0.07] p-2 sm:p-3">
                  <AlumnosDelCurso curso={c} onAlumno={setAlumno} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
