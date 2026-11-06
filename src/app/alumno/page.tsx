import { AlumnoView } from "@/features/sesiones-alumno";

// ?codigo=XXXXXX viene del QR que muestra el docente (ver CodigoSesion).
export default async function AlumnoPage({ searchParams }: PageProps<"/alumno">) {
  const { codigo } = await searchParams;
  const limpio = typeof codigo === "string" ? codigo.trim().toUpperCase() : "";
  return <AlumnoView codigoQr={/^[A-Z0-9]{4,8}$/.test(limpio) ? limpio : null} />;
}
