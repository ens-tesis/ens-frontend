"use client";

interface PestanasProps<T extends string> {
  opciones: { id: T; etiqueta: string }[];
  activa: T;
  onCambiar: (id: T) => void;
  etiqueta?: string;
}

// Control segmentado para sub-filtros dentro de una sección.
export function Pestanas<T extends string>({ opciones, activa, onCambiar, etiqueta }: PestanasProps<T>) {
  return (
    <div role="tablist" aria-label={etiqueta} className="flex gap-1 overflow-x-auto rounded-2xl bg-carbon/[0.06] p-1">
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={o.id === activa}
          onClick={() => onCambiar(o.id)}
          className={`min-h-10 flex-1 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon ${
            o.id === activa ? "bg-white text-carbon shadow-tarjeta" : "text-carbon/60 hover:text-carbon"
          }`}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}
