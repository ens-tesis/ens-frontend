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
