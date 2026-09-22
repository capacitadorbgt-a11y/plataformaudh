export type ExpresionBot = "feliz" | "neutral" | "pensando" | "confundido";

const BOCAS: Record<ExpresionBot, string> = {
  feliz: "M23 47 Q32 55 41 47",
  neutral: "M25 48 L39 48",
  pensando: "M29 48 A3.4 3.4 0 1 0 29 48.1",
  confundido: "M24 49 Q29 44 33 49 T42 49",
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
  const ojosDesviados = expresion === "confundido";

  return (
    <svg
      viewBox="0 0 64 80"
      width={size}
      height={(size * 80) / 64}
      className={className}
      role="img"
      aria-label={`UDH Bot, expresión ${expresion}`}
    >
      {/* Orejas / antenas redondeadas */}
      <circle cx="14" cy="10" r="6" fill="#c2410c" />
      <circle cx="50" cy="10" r="6" fill="#c2410c" />
      <circle cx="14" cy="10" r="3" fill="#fdba74" />
      <circle cx="50" cy="10" r="3" fill="#fdba74" />

      {/* Cuerpo (torso pequeño) */}
      <rect x="14" y="52" width="36" height="24" rx="14" fill="#1e3a63" />
      <circle cx="32" cy="64" r="4" fill="#f97316" />

      {/* Cabeza */}
      <rect x="4" y="6" width="56" height="52" rx="24" fill="#172b4c" />

      {/* Visor / antifaz */}
      <rect x="13" y="26" width="38" height="16" rx="8" fill="#fff7ed" />

      {/* Ojos */}
      <circle cx={ojosDesviados ? 23 : 24} cy={ojosDesviados ? 32 : 34} r="4" fill="#172b4c" />
      <circle cx={ojosDesviados ? 42 : 40} cy={ojosDesviados ? 35 : 34} r="4" fill="#172b4c" />

      {/* Boca */}
      <path d={BOCAS[expresion]} stroke="#fdba74" strokeWidth="2.6" strokeLinecap="round" fill="none" />

      {/* Mejillas */}
      <circle cx="12" cy="42" r="2.6" fill="#f97316" fillOpacity="0.55" />
      <circle cx="52" cy="42" r="2.6" fill="#f97316" fillOpacity="0.55" />
    </svg>
  );
}
