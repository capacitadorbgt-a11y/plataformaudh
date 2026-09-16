"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Seguimiento } from "@/types/database";

type SeguimientoRow = Seguimiento & { escuelas: { nombre: string } | null };

export default function SeguimientosTable({
  seguimientos,
}: {
  seguimientos: SeguimientoRow[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!selectedId}
          onClick={() => selectedId && router.push(`/seguimientos/${selectedId}/editar`)}
          className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Editar
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="px-4 py-3 font-medium w-8"></th>
              <th className="px-4 py-3 font-medium">Escuela</th>
              <th className="px-4 py-3 font-medium">Fecha capacitación</th>
              <th className="px-4 py-3 font-medium">Cargo</th>
              <th className="px-4 py-3 font-medium">Aspirantes</th>
              <th className="px-4 py-3 font-medium">Aprobado</th>
              <th className="px-4 py-3 font-medium">PDV solicitud</th>
              <th className="px-4 py-3 font-medium">Analista</th>
            </tr>
          </thead>
          <tbody>
            {seguimientos.map((s) => (
              <tr
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`border-b border-neutral-100 last:border-0 hover:bg-neutral-50 cursor-pointer ${
                  selectedId === s.id ? "bg-udh-50" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <input
                    type="radio"
                    name="seguimiento-select"
                    checked={selectedId === s.id}
                    onChange={() => setSelectedId(s.id)}
                    aria-label={`Seleccionar seguimiento de ${s.escuelas?.nombre ?? s.escuela_nombre_libre ?? ""}`}
                  />
                </td>
                <td className="px-4 py-3 font-medium">
                  {s.escuelas?.nombre ?? s.escuela_nombre_libre ?? "—"}
                </td>
                <td className="px-4 py-3 text-neutral-600">{s.fecha_capacitacion ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{s.cargo ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{s.num_aspirantes ?? 0}</td>
                <td className="px-4 py-3 text-neutral-600">{s.aspirante_aprobado ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{s.pdv_solicitud ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{s.analista ?? "—"}</td>
              </tr>
            ))}
            {seguimientos.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-neutral-400">
                  No se encontraron seguimientos con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
