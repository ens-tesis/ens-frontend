// Logo de ENS: medio ojo (párpados, medio iris, pupila violeta) que sale
// del palo de la E, seguido de "ns". E, n y s son los contornos de
// Bricolage Grotesque 800 (la fuente de la app) en unidades de la fuente,
// línea de base en y=0. Letras y ojo en currentColor: arena sobre el
// pizarrón, verde sobre fondo claro; la pupila siempre violeta.

const E = "M40 0V-660H202V0ZM161 0V-135H512V0ZM161 -272V-393H466V-272ZM161 -525V-660H512V-525Z";
const N =
  "M36 0V-299V-528H173V-313H181Q187 -391 207.0 -441.5Q227 -492 264.0 -517.0Q301 -542 358 -542Q444 -542 487.5 -485.0Q531 -428 531 -315V0H369V-294Q369 -348 352.5 -375.0Q336 -402 300 -402Q270 -402 247.0 -381.0Q224 -360 211.0 -313.0Q198 -266 198 -187V0Z";
const S =
  "M267 14Q214 14 168.5 3.5Q123 -7 89.5 -30.0Q56 -53 38.5 -91.5Q21 -130 24 -185L165 -197Q167 -164 180.0 -142.5Q193 -121 216.0 -111.0Q239 -101 272 -101Q303 -101 325.5 -111.5Q348 -122 348 -147Q348 -160 340.0 -168.5Q332 -177 310.5 -184.5Q289 -192 248 -202Q197 -215 156.0 -228.0Q115 -241 86.0 -259.0Q57 -277 42.0 -303.5Q27 -330 27 -369Q27 -424 56.5 -462.5Q86 -501 138.0 -521.5Q190 -542 258 -542Q319 -542 372.0 -523.0Q425 -504 455.5 -461.0Q486 -418 478 -347L340 -334Q343 -363 332.0 -383.5Q321 -404 300.0 -414.5Q279 -425 249 -425Q215 -425 196.5 -412.5Q178 -400 178 -381Q178 -366 189.5 -355.5Q201 -345 225.5 -337.5Q250 -330 289 -321Q323 -314 360.0 -303.0Q397 -292 429.0 -273.5Q461 -255 481.0 -225.0Q501 -195 501 -149Q501 -100 474.0 -63.0Q447 -26 395.0 -6.0Q343 14 267 14Z";

const VIOLETA = "#ca73e4";

function OjoYE() {
  return (
    <>
      <path
        d="M40 -616 Q-295 -618 -536 -330 Q-295 -42 40 -44"
        fill="none"
        stroke="currentColor"
        strokeWidth="92"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M40 -519 A189 189 0 0 0 40 -141" fill="none" stroke="currentColor" strokeWidth="50" />
      <path d="M40 -442 A112 112 0 0 0 40 -218 Z" fill={VIOLETA} />
      <circle cx="-28" cy="-388" r="27" fill="#ffffff" />
      <path d={E} fill="currentColor" />
    </>
  );
}

// "Ens" completo.
export function LogoPalabra({ className, titulo = "ENS" }: { className?: string; titulo?: string }) {
  return (
    <svg viewBox="-610 -700 2170 740" role="img" aria-label={titulo} className={className}>
      <OjoYE />
      <path d={N} transform="translate(490 0)" fill="currentColor" />
      <path d={S} transform="translate(1023.4 0)" fill="currentColor" />
    </svg>
  );
}

// Solo el medio ojo y la E: para espacios chicos.
export function LogoMarca({ className }: { className?: string }) {
  return (
    <svg viewBox="-610 -760 1160 860" aria-hidden="true" className={className}>
      <OjoYE />
    </svg>
  );
}
