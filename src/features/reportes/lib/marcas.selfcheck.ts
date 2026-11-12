import assert from "node:assert/strict";
import { marcaClase, marcaDia } from "./marcas";
import type { Participacion } from "../types";

// ../../ens-backend/node_modules/.bin/tsx src/features/reportes/lib/marcas.selfcheck.ts
const base: Participacion = {
  sesionId: 1, alumnoId: 1, minutosDesdeInicio: 0, tarde: false,
  distracciones: 0, ausenciasDigitales: 0, cortesDeRed: 0, salidasAntesDelFinal: 0, motivos: [],
};
const tarde = { ...base, tarde: true };
const seFue = { ...base, salidasAntesDelFinal: 1 };

assert.deepEqual(marcaClase(undefined), { marca: "A", salio: false });
assert.deepEqual(marcaClase(base), { marca: "P", salio: false });
assert.deepEqual(marcaClase(tarde), { marca: "T", salio: false });
assert.deepEqual(marcaClase(seFue), { marca: "P", salio: true });

assert.equal(marcaDia(0, []), null, "sin clases, sin marca");
assert.deepEqual(marcaDia(2, []), { marca: "A", salio: false });
assert.deepEqual(marcaDia(2, [base, base]), { marca: "P", salio: false });
assert.deepEqual(marcaDia(2, [base, tarde]), { marca: "T", salio: false }, "tarde a una = T");
assert.deepEqual(marcaDia(2, [base]), { marca: "PA", salio: false });
assert.deepEqual(marcaDia(2, [tarde]), { marca: "PA", salio: false }, "faltar pesa más que llegar tarde");
assert.deepEqual(marcaDia(2, [seFue, base]), { marca: "P", salio: true });
assert.deepEqual(marcaDia(3, [seFue]), { marca: "PA", salio: true });
console.log("marcas.selfcheck OK");
