import { AvisoColegioActual } from "@/features/colegios";
import { PanelRol, type SeccionPanel } from "@/features/panel";

const SECCIONES: SeccionPanel[] = [
  {
    segmento: "metricas",
    etiqueta: "Métricas",
    icono: "metricas",
    descripcion: "Uso del ENS por curso o por docente. Filtrá por fechas y exportá a Excel.",
  },
  {
    segmento: "asistencia",
    etiqueta: "Asistencia",
    icono: "asistencia",
    descripcion: "Por clase: quién se conectó, quién faltó y quién llegó tarde o no se quedó conectado.",
  },
  {
    segmento: "historial",
    etiqueta: "Historial",
    icono: "historial",
    descripcion: "Todas las clases de la institución, con quién estuvo y qué pasó en cada una.",
  },
  {
    segmento: "cursos",
    etiqueta: "Cursos",
    icono: "cursos",
    descripcion: "Creá cursos, matriculá alumnos y asigná docentes y preceptores.",
  },
  {
    segmento: "alta",
    etiqueta: "Alta de usuarios",
    etiquetaCorta: "Alta",
    icono: "alta",
    descripcion: "Creá cuentas de preceptores y docentes. Los alumnos se cargan desde cada curso.",
  },
  {
    segmento: "usuarios",
    etiqueta: "Usuarios",
    icono: "usuarios",
    descripcion: "Cambiá roles y activá o desactivá cuentas.",
  },
  {
    segmento: "importar-sie",
    etiqueta: "Importar SIE",
    icono: "alumnos",
    descripcion: "Cargá de una vez a los alumnos desde el listado exportado del SIE.",
  },
];

// El admin también entra acá, para operar el colegio que eligió en /admin.
export default function DirectorLayout({ children }: LayoutProps<"/director">) {
  return (
    <PanelRol
      roles={["director", "admin"]}
      base="director"
      area="Dirección"
      secciones={SECCIONES}
      ordenInferior={["alta", "usuarios", "metricas", "asistencia", "historial"]}
      // Las alertas van a docente y preceptores; dirección no recibe ninguna.
      conNotificaciones={false}
      aviso={<AvisoColegioActual />}
    >
      {children}
    </PanelRol>
  );
}
