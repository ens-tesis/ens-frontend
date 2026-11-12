// URL del backend en tiempo de ejecución (no horneada en el build): el
// túnel del backend cambia de URL al relanzarse y antes había que
// redeployar el frontend. Ahora se cambia un ítem de Vercel Edge Config
// ("backendUrl") y todos los clientes la toman al próximo pedido.
// EDGE_CONFIG es la connection string que pone Vercel al conectar el store
// al proyecto: https://edge-config.vercel.com/<id>?token=<token>. Sin ella
// (desarrollo), NEXT_PUBLIC_API_URL.
export const dynamic = "force-dynamic";

const FALLBACK = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function desdeEdgeConfig(): Promise<string | null> {
  const conexion = process.env.EDGE_CONFIG;
  if (!conexion) return null;
  const u = new URL(conexion);
  const res = await fetch(`${u.origin}${u.pathname}/item/backendUrl${u.search}`, { cache: "no-store" });
  if (!res.ok) return null;
  const valor: unknown = await res.json();
  return typeof valor === "string" && /^https?:\/\//.test(valor) ? valor.replace(/\/$/, "") : null;
}

export async function GET() {
  const apiUrl = (await desdeEdgeConfig().catch(() => null)) ?? FALLBACK;
  return Response.json({ apiUrl }, { headers: { "cache-control": "no-store" } });
}
