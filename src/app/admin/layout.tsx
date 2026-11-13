import { PanelRol, type SeccionPanel } from "@/features/panel";

const SECCIONES: SeccionPanel[] = [
  {
    segmento: "inicio",
    etiqueta: "Inicio",
    icono: "inicio",
    descripcion: "Todos los colegios juntos: cuánta gente tienen y cuánto se usa el ENS.",
  },
  {
    segmento: "crear-colegio",
    etiqueta: "Crear colegio",
    icono: "mas",
    descripcion: "Dá de alta un colegio junto con su director. El director entra con una contraseña provisoria.",
  },
  {
    segmento: "colegios",
    etiqueta: "Colegios",
    icono: "colegio",
    descripcion: "Las métricas de cada colegio, sus directores, y entrar a operarlo o eliminarlo.",
  },
  {
    segmento: "auditoria",
    etiqueta: "Auditoría",
    icono: "auditoria",
    descripcion: "Latencia de la whitelist (objetivo ≤500 ms), errores del sistema y acciones administrativas.",
  },
];

// El admin no pertenece a ningún colegio: los crea y los supervisa.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <PanelRol
      roles={["admin"]}
      base="admin"
      area="Administración"
      secciones={SECCIONES}
      ordenInferior={["crear-colegio", "inicio", "colegios", "auditoria"]}
      conNotificaciones={false}
    >
      {children}
    </PanelRol>
  );
}
