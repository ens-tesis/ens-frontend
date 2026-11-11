import { PanelDocente } from "@/features/sesiones-docente";

// La clase en vivo (WebSocket) vive en este layout: no se corta al
// cambiar de sección.
export default function DocenteLayout({ children }: LayoutProps<"/docente">) {
  return <PanelDocente>{children}</PanelDocente>;
}
