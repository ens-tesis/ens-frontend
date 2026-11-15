import assert from "node:assert/strict";
import { atajoActivo, periodoDeAtajo } from "./periodo";

// Domingo 15/11/2026: la semana arranca el lunes 9.
const domingo = new Date(2026, 10, 15);
assert.deepEqual(periodoDeAtajo("semana", domingo), { desde: "2026-11-09", hasta: "2026-11-15" });
assert.deepEqual(periodoDeAtajo("semana", new Date(2026, 10, 9)), { desde: "2026-11-09", hasta: "2026-11-09" });
// Semana que cruza el cambio de mes.
assert.equal(periodoDeAtajo("semana", new Date(2026, 9, 1)).desde, "2026-09-28");
assert.equal(periodoDeAtajo("mes", domingo).desde, "2026-11-01");

assert.equal(periodoDeAtajo("cuatrimestre", domingo).desde, "2026-08-01");
assert.equal(periodoDeAtajo("cuatrimestre", new Date(2026, 6, 31)).desde, "2026-03-01");
assert.equal(periodoDeAtajo("cuatrimestre", new Date(2026, 2, 1)).desde, "2026-03-01");
// Receso de verano: el 2.º cuatrimestre y el año lectivo anteriores.
assert.equal(periodoDeAtajo("cuatrimestre", new Date(2027, 1, 10)).desde, "2026-08-01");
assert.equal(periodoDeAtajo("anio", new Date(2027, 0, 5)).desde, "2026-03-01");
assert.equal(periodoDeAtajo("anio", domingo).desde, "2026-03-01");

assert.equal(atajoActivo({ desde: "2026-11-01", hasta: "2026-11-15" }, domingo), "mes");
assert.equal(atajoActivo({ desde: "2026-11-02", hasta: "2026-11-15" }, domingo), null);
assert.equal(atajoActivo({ desde: "", hasta: "" }, domingo), null);
