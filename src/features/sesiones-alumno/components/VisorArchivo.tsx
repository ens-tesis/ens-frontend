"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api } from "@/shared/api/client";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { idDeArchivo } from "@/shared/lib/url";

// Muestra un archivo subido por el docente (modo "archivo") sin salir del
// ENS. El contenido se pide por XHR con el token (el backend nunca lo sirve
// como documento navegable) y se dibuja acá según su tipo: imagen, video y
// audio con el elemento nativo; PDF, Word y Excel con una librería que se
// carga recién cuando hace falta (import dinámico).

const WORD = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const HOJAS = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
];


// Una página por <canvas>, dibujada recién cuando está por entrar en
// pantalla: un PDF de 200 páginas no se rasteriza entero en un celular.
function VisorPdf({ blob, url }: { blob: Blob; url: string }) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;
    let cancelado = false;
    let observador: IntersectionObserver | undefined;

    (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      const pdf = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise;
      const primera = (await pdf.getPage(1)).getViewport({ scale: 1 });
      if (cancelado) return;

      const ancho = contenedor.clientWidth;
      observador = new IntersectionObserver(
        (entradas) => {
          for (const entrada of entradas) {
            if (!entrada.isIntersecting) continue;
            observador?.unobserve(entrada.target);
            const canvas = entrada.target as HTMLCanvasElement;
            void pdf.getPage(Number(canvas.dataset.pagina)).then((pagina) => {
              const base = pagina.getViewport({ scale: 1 });
              // Hasta 2x: nítido en pantallas retina sin reventar la memoria.
              const viewport = pagina.getViewport({
                scale: (ancho / base.width) * Math.min(window.devicePixelRatio || 1, 2),
              });
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              canvas.style.aspectRatio = `${base.width} / ${base.height}`;
              return pagina.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
            });
          }
        },
        { rootMargin: "800px" },
      );
      for (let n = 1; n <= pdf.numPages; n++) {
        const canvas = document.createElement("canvas");
        canvas.dataset.pagina = String(n);
        canvas.className = "mx-auto mb-3 block w-full max-w-4xl bg-white shadow-tarjeta";
        canvas.style.aspectRatio = `${primera.width} / ${primera.height}`;
        contenedor.appendChild(canvas);
        observador.observe(canvas);
      }
    })().catch(() => {
      if (!cancelado) setFallo(true);
    });

    return () => {
      cancelado = true;
      observador?.disconnect();
      contenedor.replaceChildren();
    };
  }, [blob]);

  // Navegador sin lo que pdf.js necesita: queda el visor de PDF nativo.
  if (fallo) return <iframe src={url} title="PDF" className="h-full w-full bg-white" />;
  return <div ref={contenedorRef} className="p-3" />;
}

function VisorWord({ blob }: { blob: Blob }) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;
    import("docx-preview")
      .then((docx) => docx.renderAsync(blob, contenedor, undefined, { ignoreLastRenderedPageBreak: false }))
      .catch(() => setFallo(true));
    return () => contenedor.replaceChildren();
  }, [blob]);

  if (fallo) return <NoSePuedeMostrar />;
  // docx-preview dibuja hojas de ancho fijo: en un celular se desplaza de costado.
  return <div ref={contenedorRef} className="overflow-x-auto" />;
}

interface Hoja {
  nombre: string;
  filas: string[][];
}

// Tabla armada con React a partir de los valores (no con el HTML que genera
// la librería): el contenido de una celda nunca se interpreta como HTML.
function VisorHojas({ blob }: { blob: Blob }) {
  const [hojas, setHojas] = useState<Hoja[] | null>(null);
  const [activa, setActiva] = useState(0);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let cancelado = false;
    Promise.all([import("xlsx"), blob.arrayBuffer()])
      .then(([XLSX, datos]) => {
        const libro = XLSX.read(datos);
        const leidas = libro.SheetNames.map((nombre) => ({
          nombre,
          filas: XLSX.utils.sheet_to_json<string[]>(libro.Sheets[nombre]!, {
            header: 1,
            raw: false,
            defval: "",
          }),
        }));
        if (!cancelado) setHojas(leidas);
      })
      .catch(() => {
        if (!cancelado) setFallo(true);
      });
    return () => {
      cancelado = true;
    };
  }, [blob]);

  if (fallo) return <NoSePuedeMostrar />;
  if (!hojas) return <Centrado><MensajeEstado tipo="cargando">Abriendo la planilla...</MensajeEstado></Centrado>;
  const hoja = hojas[activa];

  return (
    <div className="flex h-full flex-col">
      {hojas.length > 1 && (
        <div role="tablist" className="flex shrink-0 gap-1 overflow-x-auto border-b border-carbon/10 p-2">
          {hojas.map((h, i) => (
            <button
              key={h.nombre}
              type="button"
              role="tab"
              aria-selected={i === activa}
              onClick={() => setActiva(i)}
              className={`min-h-10 shrink-0 rounded-lg px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon ${
                i === activa ? "bg-verde text-arena" : "text-carbon/70 hover:bg-carbon/5"
              }`}
            >
              {h.nombre}
            </button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="border-collapse text-sm text-carbon">
          <tbody>
            {hoja?.filas.map((fila, f) => (
              <tr key={f}>
                <th className="sticky left-0 border border-carbon/10 bg-papel px-2 text-xs font-normal text-carbon/50">
                  {f + 1}
                </th>
                {fila.map((celda, c) => (
                  <td key={c} className="border border-carbon/10 px-2 py-1 whitespace-nowrap">
                    {celda}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VisorTexto({ blob }: { blob: Blob }) {
  const texto = useQuery({ queryKey: ["archivo-texto", blob.size, blob.type], queryFn: () => blob.text() });
  return <pre className="p-4 text-sm whitespace-pre-wrap text-carbon">{texto.data}</pre>;
}

function Centrado({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">{children}</div>;
}

function NoSePuedeMostrar() {
  return (
    <Centrado>
      <MensajeEstado tipo="error">No se pudo abrir este archivo.</MensajeEstado>
    </Centrado>
  );
}

function Contenido({ blob, url, nombre }: { blob: Blob; url: string; nombre: string }) {
  const tipo = blob.type;

  if (tipo.startsWith("image/")) {
    // eslint-disable-next-line @next/next/no-img-element -- es un blob local, next/image no aplica
    return <img src={url} alt={nombre} className="mx-auto max-w-full" />;
  }
  if (tipo === "application/pdf") return <VisorPdf blob={blob} url={url} />;
  if (tipo === WORD) return <VisorWord blob={blob} />;
  if (HOJAS.includes(tipo)) return <VisorHojas blob={blob} />;
  if (tipo.startsWith("video/")) return <video src={url} controls className="mx-auto max-h-full max-w-full" />;
  if (tipo.startsWith("audio/")) {
    return (
      <Centrado>
        <audio src={url} controls />
      </Centrado>
    );
  }
  if (tipo.startsWith("text/")) return <VisorTexto blob={blob} />;

  // Formatos sin visor en el navegador (.doc, .ppt/.pptx, otros).
  return (
    <Centrado>
      <MensajeEstado tipo="info">Este tipo de archivo no se puede ver acá adentro.</MensajeEstado>
      <a
        href={url}
        download={nombre}
        className="inline-flex min-h-11 items-center rounded-xl bg-violeta px-5 text-sm font-semibold text-carbon hover:bg-violeta-hover"
      >
        Descargar {nombre}
      </a>
    </Centrado>
  );
}

export function VisorArchivo({ url, nombre }: { url: string; nombre: string }) {
  const id = idDeArchivo(url);
  const archivo = useQuery({
    queryKey: ["archivo", id],
    enabled: id !== null,
    staleTime: Infinity,
    // ponytail: el object URL se crea junto con el blob y no se revoca —
    // vive lo que la pestaña, igual que el blob en la caché de la query.
    // Son pocos archivos por clase; revocar al salir de la caché si alguna
    // vez se abren muchos archivos grandes en una misma sesión.
    queryFn: () =>
      api
        .get<Blob>(`/archivos/${id}/contenido`, { responseType: "blob" })
        .then((r) => ({ blob: r.data, url: URL.createObjectURL(r.data) })),
  });

  return (
    <div className="h-full min-h-[75vh] overflow-auto rounded-2xl border border-carbon/[0.07] bg-white">
      {archivo.data ? (
        <Contenido blob={archivo.data.blob} url={archivo.data.url} nombre={nombre} />
      ) : archivo.isError || id === null ? (
        <NoSePuedeMostrar />
      ) : (
        <Centrado>
          <MensajeEstado tipo="cargando">Cargando archivo...</MensajeEstado>
        </Centrado>
      )}
    </div>
  );
}
