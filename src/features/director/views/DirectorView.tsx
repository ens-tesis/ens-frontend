"use client";

import { useState } from "react";
import { useGuardRol } from "@/features/auth";
import { NotificacionesCampana } from "@/features/notificaciones";
import { Historial, useCursos } from "@/features/reportes";
import { AppShell, PantallaCargando, type ItemNav } from "@/shared/components/AppShell";
import { GestionCursos } from "../components/GestionCursos";
import { GestionUsuarios } from "../components/GestionUsuarios";
import { Metricas } from "../components/Metricas";

type Seccion = "metricas" | "historial" | "cursos" | "usuarios";

const SECCIONES: (ItemNav<Seccion> & { descripcion: string })[] = [
  {
    id: "metricas",
    etiqueta: "Métricas",
    icono: "metricas",
    descripcion: "Uso del ENS por curso o por docente. Filtrá por fechas y exportá a Excel.",
  },
  {
    id: "historial",
    etiqueta: "Historial",
    icono: "historial",
    descripcion: "Todas las clases de la institución, con quién estuvo y qué pasó en cada una.",
  },
  {
    id: "cursos",
    etiqueta: "Cursos",
    icono: "cursos",
    descripcion: "Creá cursos, matriculá alumnos y asigná preceptores.",
  },
  {
    id: "usuarios",
    etiqueta: "Usuarios",
    icono: "usuarios",
    descripcion: "Cambiá roles y activá o desactivá cuentas.",
  },
];

// Admin entra a la misma pantalla: tiene todo lo del director y más.
export default function DirectorView() {
  const { cargando, usuario } = useGuardRol(["director", "admin"]);
  const cursos = useCursos(Boolean(usuario));
  const [seccion, setSeccion] = useState<Seccion>("metricas");

  if (cargando) return <PantallaCargando />;
  if (!usuario) return null;

  const actual = SECCIONES.find((s) => s.id === seccion)!;

  return (
    <AppShell
      area={usuario.rol === "admin" ? "Administración" : "Dirección"}
      usuario={usuario}
      secciones={SECCIONES}
      activa={seccion}
      onCambiar={setSeccion}
      titulo={actual.etiqueta}
      descripcion={actual.descripcion}
      acciones={<NotificacionesCampana />}
    >
      {seccion === "metricas" && <Metricas />}
      {seccion === "historial" && <Historial cursos={cursos.data ?? []} />}
      {seccion === "cursos" && <GestionCursos />}
      {seccion === "usuarios" && <GestionUsuarios actor={usuario} />}
    </AppShell>
  );
}
