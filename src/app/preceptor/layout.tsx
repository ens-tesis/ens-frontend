import { PanelRol, type SeccionPanel } from "@/features/panel";

const SECCIONES: SeccionPanel[] = [
  {
    segmento: "asistencia",
    etiqueta: "Asistencia",
    icono: "asistencia",
    descripcion: "Por clase: quién se conectó, quién faltó y quién llegó tarde o no se quedó conectado.",
  },
  {
    segmento: "metricas",
    etiqueta: "Métricas",
    icono: "metricas",
    descripcion: "Uso del ENS en tus cursos, por curso o por docente. Filtrá por fechas y exportá a Excel.",
  },
  {
    segmento: "historial",
    etiqueta: "Historial",
    icono: "historial",
    descripcion: "Las clases de tus cursos: quién estuvo, quién se distrajo y quién perdió la conexión.",
  },
  {
    segmento: "mis-cursos",
    etiqueta: "Mis cursos",
    icono: "cursos",
    descripcion: "Elegí un alumno para ver su asistencia digital en todas las clases.",
  },
  {
    segmento: "cursos",
    etiqueta: "Gestionar cursos",
    etiquetaCorta: "Gestión",
    icono: "alumnos",
    descripcion: "Creá cursos, cargá o matriculá alumnos y asigná a los docentes de cada curso.",
  },
  {
    segmento: "alta-docentes",
    etiqueta: "Alta de docentes",
    etiquetaCorta: "Alta",
    icono: "alta",
    descripcion: 'Creá la cuenta de un docente; después asignalo a tus cursos en "Gestionar cursos".',
  },
];

export default function PreceptorLayout({ children }: LayoutProps<"/preceptor">) {
  return (
    <PanelRol
      roles={["preceptor"]}
      base="preceptor"
      area="Preceptoría"
      secciones={SECCIONES}
      ordenInferior={["mis-cursos", "asistencia", "metricas", "cursos", "alta-docentes"]}
    >
      {children}
    </PanelRol>
  );
}
