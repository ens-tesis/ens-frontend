import assert from "node:assert/strict";
import { armarRegistro, atencionPorAlumno, duracion, type EventoClase } from "./registro";

// npx tsx src/features/sesiones-docente/registro.selfcheck.ts
const ev = (alumnoId: number, estado: EventoClase["estado"], seg: number): EventoClase => ({
  alumnoId,
  estado,
  tipoDesconexion: null,
  ts: new Date(Date.UTC(2026, 10, 9, 10, 0, seg)).toISOString(),
});

const registro = armarRegistro([
  ev(1, "conectado", 0),
  ev(2, "conectado", 1),
  ev(1, "fuera_de_foco", 10),
  ev(1, "fuera_de_foco", 11), // repetido: se junta
  ev(1, "ausente_digital", 25), // escala: cierra la anterior y abre otra
  ev(2, "sin_red", 30),
  ev(1, "conectado", 40),
  ev(2, "actividad_reducida", 50),
]);

assert.deepEqual(
  registro.map((r) => [r.alumnoId, r.estado, r.hasta && duracion(r.desde, r.hasta)]),
  [
    [2, "actividad_reducida", null], // lo más nuevo primero, sigue así
    [2, "sin_red", "20 s"],
    [1, "ausente_digital", "15 s"],
    [1, "fuera_de_foco", "15 s"],
  ],
);
assert.equal(duracion("2026-11-09T10:00:00Z", "2026-11-09T10:03:05Z"), "3 min 5 s");
assert.equal(duracion("2026-11-09T10:00:00Z", "2026-11-09T10:02:00Z"), "2 min");
assert.equal(duracion("2026-11-09T10:00:00Z", "2026-11-09T11:12:00Z"), "1 h 12 min");

// Alumno 1: 15 s fuera de foco + 15 s ausente = 30 s, 1 distracción -> verde.
// Alumno 2: sin red no cuenta; pantalla dividida abierta desde el seg 50
// hasta "ahora" (seg 130) = 80 s -> ámbar.
const ahora = Date.UTC(2026, 10, 9, 10, 2, 10);
const atencion = atencionPorAlumno(registro, 3, ahora);
assert.deepEqual(atencion.get(1), { distracciones: 1, segundosFuera: 30, nivel: "verde" });
assert.deepEqual(atencion.get(2), { distracciones: 0, segundosFuera: 80, nivel: "ambar" });
// Superar el umbral del curso (como la alerta) pone en rojo aunque haya
// sido poco tiempo.
const reiterado = armarRegistro([
  ev(3, "fuera_de_foco", 0), ev(3, "conectado", 1),
  ev(3, "fuera_de_foco", 2), ev(3, "conectado", 3),
  ev(3, "fuera_de_foco", 4), ev(3, "conectado", 5),
]);
assert.equal(atencionPorAlumno(reiterado, 2, ahora).get(3)?.nivel, "rojo");
assert.equal(atencionPorAlumno(reiterado, 3, ahora).get(3)?.nivel, "ambar");
console.log("registro.selfcheck OK");
