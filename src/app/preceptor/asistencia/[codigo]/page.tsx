import { AsistenciaClase } from "@/features/reportes";

export default async function Page({ params }: PageProps<"/preceptor/asistencia/[codigo]">) {
  const { codigo } = await params;
  return <AsistenciaClase codigo={codigo} volver="/preceptor/asistencia" />;
}
