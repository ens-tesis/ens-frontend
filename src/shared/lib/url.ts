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

// Lo que se muestra de un sitio: el nombre que le puso el docente o, si no
// tiene, el dominio.
export function tituloDe(item: { url: string; nombre: string | null }): string {
  return item.nombre || hostnameDe(item.url);
}
