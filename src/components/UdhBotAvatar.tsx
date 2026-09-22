export type ExpresionBot = "feliz" | "neutral" | "pensando" | "confundido";

const BOCAS: Record<ExpresionBot, string> = {
  feliz: "M22 38 Q32 48 42 38",
  neutral: "M24 40 L40 40",
  pensando: "M28 40 A4 4 0 1 0 28 40.1",
  confundido: "M23 41 Q28 36 33 41 T43 41",
};

export default function UdhBotAvatar({
  expresion = "neutral",
  size = 56,
  className = "",
}: {
  expresion?: ExpresionBot;
  size?: number;
  className?: string;
}) {
  const ojoIzq = expresion === "confundido" ? { r: 2.4, cy: 27 } : { r: 3.2, cy: 26 };
  const ojoDer = expresion === "confundido" ? { r: 4, cy: 25 } : { r: 3.2, cy: 26 };

  return (
    <svg
      viewBox="0 0 64 70"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`UDH Bot, expresión ${expresion}`}
    >
      {/* Antena */}
      <line x1="32" y1="4" x2="32" y2="12" stroke="#c2410c" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="4" r="3" fill="#f97316" />

      {/* Emblema tipo "scoop" (inspirado en el logo de la U del Helado) */}
      <circle cx="27" cy="11" r="4.2" fill="#fed7aa" />
      <circle cx="37" cy="11" r="4.2" fill="#fdba74" />
      <circle cx="32" cy="8" r="4.6" fill="#fff7ed" />

      {/* Cabeza */}
      <rect x="6" y="14" width="52" height="46" rx="18" fill="#172b4c" />
      <rect x="6" y="14" width="52" height="46" rx="18" fill="url(#udhBotGradiente)" fillOpacity="0.25" />

      {/* Pantalla facial */}
      <rect x="14" y="22" width="36" height="30" rx="12" fill="#0b1a30" />

      {/* Ojos */}
      <circle cx="24" cy={ojoIzq.cy} r={ojoIzq.r} fill="#fdba74" />
      <circle cx="40" cy={ojoDer.cy} r={ojoDer.r} fill="#fdba74" />

      {/* Boca */}
      <path d={BOCAS[expresion]} stroke="#fdba74" strokeWidth="2.4" strokeLinecap="round" fill="none" />

      {/* Orejas / laterales */}
      <rect x="1" y="30" width="6" height="14" rx="3" fill="#c2410c" />
      <rect x="57" y="30" width="6" height="14" rx="3" fill="#c2410c" />

      <defs>
        <linearGradient id="udhBotGradiente" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#000000" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
