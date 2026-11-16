// Qué significa cada cifra técnica de Auditoría y Seguimiento, en criollo.
// Mismo texto que el glosario del informe HTML (backend, informeHtml.ts).
export const GLOSARIO: [string, string][] = [
  ["ms (milisegundos)", "Milésimas de segundo: 1000 ms = 1 segundo. 500 ms es medio segundo."],
  [
    "Latencia de la whitelist",
    "Lo que tarda un cambio de sitios habilitados en llegar del docente a los celulares. Se mide la ida y vuelta servidor → celular → servidor, así que la llegada real es todavía más rápida.",
  ],
  ["Objetivo ≤500 ms", "Lo que pide el proyecto: que el cambio llegue en medio segundo o menos."],
  ["Muestras / entregas medidas", "Cuántas veces se midió: una por cada alumno conectado en cada cambio de whitelist."],
  [
    "Mediana (p50)",
    "El valor del medio: la mitad de las entregas tardó eso o menos, y la otra mitad, más. Es lo que se ve normalmente.",
  ],
  [
    "p95",
    "Percentil 95: el 95% de las entregas tardó eso o menos; solo 5 de cada 100 tardaron más. Es la cifra con la que se juzga el objetivo, porque no la arruina un caso suelto pero sí un problema real.",
  ],
  [
    "p99",
    "Percentil 99: el 99% tardó eso o menos; 1 de cada 100 tardó más. Muestra los casos más lentos, dejando afuera los extremos.",
  ],
  ["Máxima", "La entrega más lenta de todas. Suele ser un celular con mala señal o que estaba bloqueado."],
  ["% dentro del objetivo", "Qué porcentaje de las entregas llegó en 500 ms o menos."],
  [
    "Pedidos HTTP lentos",
    "Pedidos de la app al servidor (entrar, cargar la lista de alumnos, etc.) que tardaron más de 1 segundo. Agrupados por tipo de pedido; el número final (200, 401, 500...) es la respuesta del servidor: 2xx bien, 4xx pedido rechazado, 5xx error del servidor.",
  ],
  [
    "Errores (backend / navegador)",
    "Fallas registradas automáticamente. Backend: en el servidor. Navegador: en el celular o la compu de alguien usando la app.",
  ],
  ["Veredicto", "Resumen automático: \"Todo bien\", \"Para mirar\" (anduvo, pero hay algo para revisar) o \"Con problemas\"."],
  ["CPU", "Cuánto trabajó el procesador del servidor. 100% = un núcleo completo ocupado."],
  ["Memoria del backend / libre", "RAM que usa el servidor del ENS, y la que le quedaba libre a la computadora."],
  [
    "Demora del proceso (p99)",
    "Cuánto se atrasa el servidor en atender lo que le llega cuando está muy cargado. Menos de 100 ms está bien; si sube, todo se siente lento.",
  ],
  ["Conexiones en vivo", "Celulares y pantallas conectados al servidor en tiempo real (alumnos, docentes, preceptoría)."],
];

export function Glosario({ claro = false }: { claro?: boolean }) {
  return (
    <details className={`rounded-2xl px-4 py-3 text-sm ${claro ? "bg-arena/10" : "bg-papel"}`}>
      <summary className={`cursor-pointer font-semibold ${claro ? "text-arena" : "text-carbon"}`}>
        ¿Qué significa cada cosa? (p95, mediana, ms...)
      </summary>
      <dl className="mt-3 space-y-2.5">
        {GLOSARIO.map(([termino, definicion]) => (
          <div key={termino}>
            <dt className={`font-semibold ${claro ? "text-arena" : "text-carbon"}`}>{termino}</dt>
            <dd className={claro ? "text-arena/80" : "text-carbon/70"}>{definicion}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
