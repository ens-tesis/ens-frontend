import type { Storage } from "redux-persist";

// Storage de redux-persist cifrado (anteproyecto: "Redux Persist cifrado").
// Lo persistido (código de la clase, última whitelist) va a localStorage
// cifrado con AES-GCM. La clave es una CryptoKey NO extraíble guardada en
// IndexedDB: el navegador la usa pero nadie puede leer sus bytes, ni
// siquiera un script de la propia página. Copiar el localStorage a otro
// dispositivo, o editarlo a mano, no sirve: no descifra o falla la
// autenticación de GCM y se descarta.
// ponytail: un XSS en la página igual puede pedirle al navegador que
// descifre (usa la clave sin verla); esto protege el dato en reposo, no
// contra código que ya corre en el origen.

const PREFIJO = "ens_cifrado_";

function abrirDb(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const req = indexedDB.open("ens-claves", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("claves");
    req.onsuccess = () => ok(req.result);
    req.onerror = () => mal(req.error);
  });
}

function pedido<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((ok, mal) => {
    req.onsuccess = () => ok(req.result);
    req.onerror = () => mal(req.error);
  });
}

let clave: Promise<CryptoKey> | undefined;

function obtenerClave(): Promise<CryptoKey> {
  clave ??= (async () => {
    const db = await abrirDb();
    const guardada = await pedido<CryptoKey | undefined>(
      db.transaction("claves", "readonly").objectStore("claves").get("persist"),
    );
    if (guardada) return guardada;
    const nueva = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    await pedido(db.transaction("claves", "readwrite").objectStore("claves").put(nueva, "persist"));
    return nueva;
  })();
  return clave;
}

const aBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const deBase64 = (texto: string) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));

export async function cifrar(texto: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const datos = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await obtenerClave(), new TextEncoder().encode(texto));
  return `${aBase64(iv)}.${aBase64(new Uint8Array(datos))}`;
}

export async function descifrar(cifrado: string): Promise<string> {
  const [iv, datos] = cifrado.split(".");
  const plano = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: deBase64(iv ?? "") },
    await obtenerClave(),
    deBase64(datos ?? ""),
  );
  return new TextDecoder().decode(plano);
}

// En el servidor (SSR) no hay nada que persistir.
const disponible = () => typeof window !== "undefined" && typeof indexedDB !== "undefined" && Boolean(crypto?.subtle);

export const almacenamientoCifrado: Storage = {
  async getItem(k: string) {
    if (!disponible()) return null;
    const cifrado = localStorage.getItem(PREFIJO + k);
    if (!cifrado) return null;
    try {
      return await descifrar(cifrado);
    } catch {
      // Otra clave (IndexedDB borrado) o dato adulterado: se arranca de cero.
      localStorage.removeItem(PREFIJO + k);
      return null;
    }
  },
  async setItem(k: string, v: string) {
    if (!disponible()) return;
    try {
      localStorage.setItem(PREFIJO + k, await cifrar(v));
    } catch {
      // storage lleno o bloqueado: queda solo en memoria
    }
  },
  async removeItem(k: string) {
    if (disponible()) localStorage.removeItem(PREFIJO + k);
  },
};
