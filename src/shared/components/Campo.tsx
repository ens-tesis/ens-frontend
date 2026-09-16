import type { InputHTMLAttributes } from "react";

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

// text-base (16px): en mobile, un input con font-size menor a 16px hace
// que Safari/iOS haga zoom automático al enfocarlo.
export function Campo({ label, id, className, ...props }: CampoProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-carbon">
        {label}
      </label>
      <input
        id={id}
        className={`min-h-11 w-full rounded-lg border border-carbon/20 bg-arena px-3.5 py-2.5 text-base text-carbon placeholder:text-carbon/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon ${className ?? ""}`}
        {...props}
      />
    </div>
  );
}
