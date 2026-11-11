"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AltaUsuario, useGuardRol } from "@/features/auth";
import { NotificacionesCampana } from "@/features/notificaciones";
import { Asistencia, Historial, useCursos } from "@/features/reportes";
import { api } from "@/shared/api/client";
import { AppShell, PantallaCargando, type ItemNav } from "@/shared/components/AppShell";
import { Boton } from "@/shared/components/Boton";
import { Tarjeta } from "@/shared/components/Tarjeta";
import { GestionCursos } from "../components/GestionCursos";
import { GestionUsuarios } from "../components/GestionUsuarios";
import { ImportarSie } from "../components/ImportarSie";
import { Metricas } from "../components/Metricas";

type Seccion = "metricas" | "asistencia" | "historial" | "cursos" | "alta" | "usuarios" | "importar";

const SECCIONES: (ItemNav<Seccion> & { descripcion: string })[] = [
  {
    id: "metricas",
    etiqueta: "Métricas",
    icono: "metricas",
    descripcion: "Uso del ENS por curso o por docente. Filtrá por fechas y exportá a Excel.",
  },
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
    descripcion: "Todas las clases de la institución, con quién estuvo y qué pasó en cada una.",
  },
  {
    id: "cursos",
    etiqueta: "Cursos",
    icono: "cursos",
    descripcion: "Creá cursos, matriculá alumnos y asigná docentes y preceptores.",
  },
  {
    id: "alta",
    etiqueta: "Alta de usuarios",
    etiquetaCorta: "Alta",
    icono: "alta",
    descripcion: "Creá cuentas de preceptores y docentes. Los alumnos se cargan desde cada curso.",
  },
  {
    id: "usuarios",
    etiqueta: "Usuarios",
    icono: "usuarios",
    descripcion: "Cambiá roles y activá o desactivá cuentas.",
  },
  {
    id: "importar",
    etiqueta: "Importar SIE",
    icono: "alumnos",
    descripcion: "Cargá de una vez a los alumnos desde el listado exportado del SIE.",
  },
];

// El admin entra acá después de elegir un colegio en /colegios: opera
// como su director hasta que vuelve.
function useColegioDelAdmin(esAdmin: boolean) {
  return useQuery({
    queryKey: ["colegio-actual"],
    queryFn: () =>
      api
        .get<{ colegio: { id: number; nombre: string } | null }>("/instituciones/actual")
        .then((r) => r.data.colegio),
    enabled: esAdmin,
  });
}

export default function DirectorView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { cargando, usuario } = useGuardRol(["director", "admin"]);
  const esAdmin = usuario?.rol === "admin";
  const colegio = useColegioDelAdmin(esAdmin);
  const cursos = useCursos(Boolean(usuario));
  const [seccion, setSeccion] = useState<Seccion>("metricas");
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    if (esAdmin && colegio.data === null) router.replace("/colegios");
  }, [esAdmin, colegio.data, router]);

  async function volverAColegios(): Promise<void> {
    setSaliendo(true);
    await api.post("/instituciones/salir");
    queryClient.clear();
    router.push("/colegios");
  }

  if (cargando || (esAdmin && colegio.isPending)) return <PantallaCargando />;
  if (!usuario || (esAdmin && !colegio.data)) return null;

  const actual = SECCIONES.find((s) => s.id === seccion)!;

  return (
    <AppShell
      area={esAdmin ? `Administración · ${colegio.data!.nombre}` : "Dirección"}
      usuario={usuario}
      secciones={SECCIONES}
      ordenInferior={["alta", "usuarios", "metricas", "asistencia", "historial"]}
      activa={seccion}
      onCambiar={setSeccion}
      titulo={actual.etiqueta}
      descripcion={actual.descripcion}
      acciones={esAdmin ? undefined : <NotificacionesCampana />}
    >
      {esAdmin && (
        <Tarjeta className="flex flex-col gap-3 border-violeta/40 bg-violeta/15 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-carbon">
            Estás operando <span className="font-semibold">{colegio.data!.nombre}</span> como administrador.
          </p>
          <Boton variante="sutil" cargando={saliendo} onClick={() => void volverAColegios()} className="shrink-0">
            Volver a colegios
          </Boton>
        </Tarjeta>
      )}
      {seccion === "metricas" && <Metricas />}
      {seccion === "asistencia" && cursos.data && <Asistencia cursos={cursos.data} />}
      {seccion === "historial" && <Historial cursos={cursos.data ?? []} />}
      {seccion === "cursos" && <GestionCursos />}
      {seccion === "alta" && <AltaUsuario rolActor={usuario.rol} />}
      {seccion === "usuarios" && <GestionUsuarios actor={usuario} onAlta={() => setSeccion("alta")} />}
      {seccion === "importar" && <ImportarSie />}
    </AppShell>
  );
}
