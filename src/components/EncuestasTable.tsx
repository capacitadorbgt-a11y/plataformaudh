"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Encuesta } from "@/types/database";

export default function EncuestasTable({ encuestas }: { encuestas: Encuesta[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!selectedId}
          onClick={() => selectedId && router.push(`/encuestas/${selectedId}/editar`)}
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
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">PDV</th>
              <th className="px-4 py-3 font-medium">Encuestado</th>
              <th className="px-4 py-3 font-medium">Cargo</th>
              <th className="px-4 py-3 font-medium">Capacitador</th>
              <th className="px-4 py-3 font-medium">NPS</th>
              <th className="px-4 py-3 font-medium">Finalizó</th>
            </tr>
          </thead>
          <tbody>
            {encuestas.map((e) => (
              <tr
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className={`border-b border-neutral-100 last:border-0 hover:bg-neutral-50 cursor-pointer ${
                  selectedId === e.id ? "bg-udh-50" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <input
                    type="radio"
                    name="encuesta-select"
                    checked={selectedId === e.id}
                    onChange={() => setSelectedId(e.id)}
                    aria-label={`Seleccionar encuesta de ${e.nombre_encuestado}`}
                  />
                </td>
                <td className="px-4 py-3 text-neutral-600">{e.fecha_capacitacion}</td>
                <td className="px-4 py-3 font-medium">{e.pdv_capacitacion}</td>
                <td className="px-4 py-3 text-neutral-600">{e.nombre_encuestado}</td>
                <td className="px-4 py-3 text-neutral-600">{e.cargo === "Otros" ? e.cargo_otro || "Otros" : e.cargo}</td>
                <td className="px-4 py-3 text-neutral-600">{e.capacitador}</td>
                <td className="px-4 py-3 text-neutral-600">{e.nps ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{e.finalizo_proceso ?? "—"}</td>
              </tr>
            ))}
            {encuestas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-neutral-400">
                  No se encontraron encuestas con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
