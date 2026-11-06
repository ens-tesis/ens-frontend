import type { InputHTMLAttributes } from "react";

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

// Inputs, selects y fechas comparten esta clase. text-base (16px): en
// mobile, un input con font-size menor a 16px hace que Safari/iOS haga
// zoom automático al enfocarlo.
export const CLASE_CONTROL =
  "min-h-12 w-full rounded-xl border border-carbon/15 bg-white px-3.5 py-2.5 text-base text-carbon transition-colors placeholder:text-carbon/40 hover:border-carbon/30 focus-visible:border-carbon focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-carbon";

export const CLASE_ETIQUETA = "block text-sm font-medium text-carbon/80";

export function Campo({ label, id, className, ...props }: CampoProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={CLASE_ETIQUETA}>
        {label}
      </label>
      <input id={id} className={`${CLASE_CONTROL} ${className ?? ""}`} {...props} />
    </div>
  );
}
