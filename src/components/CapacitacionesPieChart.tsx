"use client";

import { useState } from "react";

export interface SliceDatum {
  nombre: string;
  cantidad: number;
}

// Paleta categorica validada (orden fijo, no ciclica) - ver skill de dataviz.
const COLORES = [
  "#2a78d6", // azul
  "#eb6834", // naranja
  "#1baf7a", // aqua
  "#eda100", // amarillo
  "#e87ba4", // magenta
  "#008300", // verde
  "#4a3aa7", // violeta
];
const COLOR_OTRAS = "#b3b1a8"; // gris neutro para el residual "Otras"

const CX = 170;
const CY = 160;
const R = 110;

function polarA(cx: number, cy: number, r: number, angRad: number) {
  return { x: cx + r * Math.sin(angRad), y: cy - r * Math.cos(angRad) };
}

export default function CapacitacionesPieChart({ datos }: { datos: SliceDatum[] }) {
  const [activo, setActivo] = useState<number | null>(null);
  const total = datos.reduce((acc, d) => acc + d.cantidad, 0);

  if (total === 0) {
    return (
      <p className="text-sm text-neutral-400 py-6 text-center">
        Sin capacitaciones registradas en los últimos 30 días.
      </p>
    );
  }

  let acumulado = 0;
  const slices = datos.map((d, i) => {
    const startAng = (acumulado / total) * 2 * Math.PI;
    acumulado += d.cantidad;
    const endAng = (acumulado / total) * 2 * Math.PI;
    const midAng = (startAng + endAng) / 2;
    const pct = (d.cantidad / total) * 100;

    const p1 = polarA(CX, CY, R, startAng);
    const p2 = polarA(CX, CY, R, endAng);
    const largeArc = endAng - startAng > Math.PI ? 1 : 0;
    const path = `M ${CX} ${CY} L ${p1.x} ${p1.y} A ${R} ${R} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`;

    const labelInner = polarA(CX, CY, R + 14, midAng);
    const labelOuter = polarA(CX, CY, R + 34, midAng);
    const textAnchor: "start" | "end" | "middle" =
      Math.sin(midAng) > 0.05 ? "start" : Math.sin(midAng) < -0.05 ? "end" : "middle";
    const textX = labelOuter.x + (textAnchor === "start" ? 4 : textAnchor === "end" ? -4 : 0);

    const color = d.nombre === "Otras" ? COLOR_OTRAS : COLORES[i % COLORES.length];

    return { ...d, path, pct, color, labelInner, labelOuter, textX, textAnchor, midAng };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg
        viewBox="0 0 340 320"
        className="w-full max-w-xs shrink-0"
        role="img"
        aria-label={`Distribución de ${total} capacitaciones por escuela en los últimos 30 días`}
      >
        {slices.map((s, i) => (
          <g key={s.nombre}>
            <path
              d={s.path}
              fill={s.color}
              stroke="#fcfcfb"
              strokeWidth={2}
              strokeLinejoin="round"
              opacity={activo === null || activo === i ? 1 : 0.45}
              onPointerEnter={() => setActivo(i)}
              onPointerLeave={() => setActivo(null)}
              onFocus={() => setActivo(i)}
              onBlur={() => setActivo(null)}
              tabIndex={0}
              className="outline-none cursor-pointer transition-opacity"
            >
              <title>{`${s.nombre}: ${s.cantidad} (${s.pct.toFixed(0)}%)`}</title>
            </path>
            {s.pct >= 4 && (
              <>
                <line
                  x1={s.labelInner.x}
                  y1={s.labelInner.y}
                  x2={s.labelOuter.x}
                  y2={s.labelOuter.y}
                  stroke="#c3c2b7"
                  strokeWidth={1}
                />
                <text
                  x={s.textX}
                  y={s.labelOuter.y}
                  textAnchor={s.textAnchor}
                  dominantBaseline="middle"
                  className="fill-neutral-800 text-[11px] font-semibold"
                >
                  {s.pct.toFixed(0)}%
                </text>
              </>
            )}
          </g>
        ))}
        <text x={CX} y={CY - 6} textAnchor="middle" className="fill-neutral-900 text-lg font-bold">
          {total}
        </text>
        <text x={CX} y={CY + 12} textAnchor="middle" className="fill-neutral-400 text-[10px]">
          capacitaciones
        </text>
      </svg>

      <ul className="w-full space-y-1.5">
        {slices.map((s, i) => (
          <li
            key={s.nombre}
            onPointerEnter={() => setActivo(i)}
            onPointerLeave={() => setActivo(null)}
            className={`flex items-center justify-between gap-2 text-sm rounded-lg px-2 py-1 transition-colors ${
              activo === i ? "bg-neutral-100" : ""
            }`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-neutral-700 truncate">{s.nombre}</span>
            </span>
            <span className="text-neutral-500 shrink-0">
              {s.cantidad} · {s.pct.toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
