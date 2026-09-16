"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Entrega } from "@/types/database";

type EntregaRow = Entrega & { escuelas: { id: string; nombre: string } | null };

export default function EntregasTable({ entregas }: { entregas: EntregaRow[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!selectedId}
          onClick={() => selectedId && router.push(`/entregas/${selectedId}/editar`)}
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
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Cantidad</th>
              <th className="px-4 py-3 font-medium">Detalle</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {entregas.map((e) => (
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
                    name="entrega-select"
                    checked={selectedId === e.id}
                    onChange={() => setSelectedId(e.id)}
                    aria-label={`Seleccionar entrega de ${e.escuelas?.nombre ?? ""}`}
                  />
                </td>
                <td className="px-4 py-3 font-medium">
                  {e.escuelas ? (
                    <Link
                      href={`/escuelas/${e.escuelas.id}`}
                      onClick={(ev) => ev.stopPropagation()}
                      className="hover:underline"
                    >
                      {e.escuelas.nombre}
                    </Link>
                  ) : "—"}
                </td>
                <td className="px-4 py-3 text-neutral-600">{e.tipo}</td>
                <td className="px-4 py-3 text-neutral-600">{e.cantidad ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{e.detalle ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{e.fecha ?? "—"}</td>
              </tr>
            ))}
            {entregas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  No se encontraron entregas con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
