"use client";

import { useState } from "react";
import Link from "next/link";
import { EstadoBadge } from "@/components/Badge";
import type { Escuela } from "@/types/database";
import { exportarCSV, exportarXLS, exportarPDF } from "@/lib/exportEscuelas";

export type EscuelaConProcesos = Escuela & { procesos: number };

export default function EscuelasTable({ escuelas }: { escuelas: EscuelaConProcesos[] }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [exportando, setExportando] = useState(false);

  async function handleExportar(formato: "csv" | "xls" | "pdf") {
    setMenuAbierto(false);
    setExportando(true);
    try {
      if (formato === "csv") exportarCSV(escuelas);
      else if (formato === "xls") exportarXLS(escuelas);
      else await exportarPDF(escuelas);
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuAbierto((v) => !v)}
            disabled={exportando || escuelas.length === 0}
            className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exportando ? "Exportando..." : "Exportar"}
          </button>
          {menuAbierto && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuAbierto(false)} />
              <div className="absolute right-0 mt-1 w-40 card p-1 z-20 shadow-lg">
                {(["xls", "csv", "pdf"] as const).map((formato) => (
                  <button
                    key={formato}
                    type="button"
                    onClick={() => handleExportar(formato)}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-neutral-100"
                  >
                    {formato === "xls" ? "Excel (.xls)" : formato === "csv" ? "CSV (.csv)" : "PDF (.pdf)"}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="px-4 py-3 font-medium">Escuela</th>
              <th className="px-4 py-3 font-medium">Ciudad</th>
              <th className="px-4 py-3 font-medium">Zona</th>
              <th className="px-4 py-3 font-medium">Procesos</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {escuelas.map((e) => (
              <tr key={e.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <Link href={`/escuelas/${e.id}`} className="font-medium hover:underline">
                    {e.nombre}
                  </Link>
                  <div className="text-xs text-neutral-400">{e.provincia}</div>
                </td>
                <td className="px-4 py-3 text-neutral-600">{e.ciudad}</td>
                <td className="px-4 py-3 text-neutral-600">{e.zona}</td>
                <td className="px-4 py-3 text-neutral-600">{e.procesos}</td>
                <td className="px-4 py-3"><EstadoBadge estado={e.estado} /></td>
              </tr>
            ))}
            {escuelas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  No se encontraron escuelas con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
