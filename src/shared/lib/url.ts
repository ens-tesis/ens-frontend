// Sin validación de formato de URL en el backend (ver sesiones/dto/validation.ts),
// así que cualquier texto puede llegar acá — si no es una URL válida, mostramos
// el texto tal cual en vez de romper.
export function hostnameDe(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// Un archivo subido por el docente viaja en la whitelist como
// "archivo://<id>" (ver archivos.repository.ts del backend).
export function urlDeArchivo(id: number): string {
  return `archivo://${id}`;
}

export function idDeArchivo(url: string): number | null {
  const match = /^archivo:\/\/(\d+)$/.exec(url);
  return match ? Number(match[1]) : null;
}

// Lo que se muestra de un sitio: el nombre que le puso el docente o, si no
// tiene, el dominio.
export function tituloDe(item: { url: string; nombre: string | null }): string {
  return item.nombre || hostnameDe(item.url);
}
