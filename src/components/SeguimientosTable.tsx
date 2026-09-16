"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Seguimiento } from "@/types/database";
import { exportarCSV, exportarXLS, exportarPDF } from "@/lib/exportSeguimientos";

type SeguimientoRow = Seguimiento & { escuelas: { nombre: string } | null };

function EstadoProcesoBadge({ estado }: { estado: string }) {
  const esFinalizado = estado === "FINALIZADO";
  return (
    <span className={`badge ${esFinalizado ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
      {esFinalizado ? "Finalizado" : "En proceso"}
    </span>
  );
}

export default function SeguimientosTable({
  seguimientos,
}: {
  seguimientos: SeguimientoRow[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [exportando, setExportando] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function handleExportar(formato: "csv" | "xls" | "pdf") {
    setMenuAbierto(false);
    setExportando(true);
    try {
      if (formato === "csv") exportarCSV(seguimientos);
      else if (formato === "xls") exportarXLS(seguimientos);
      else await exportarPDF(seguimientos);
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2 relative">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuAbierto((v) => !v)}
            disabled={exportando || seguimientos.length === 0}
            className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exportando ? "Exportando..." : "Exportar"}
          </button>
          {menuAbierto && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuAbierto(false)} />
              <div
                ref={menuRef}
                className="absolute right-0 mt-1 w-40 card p-1 z-20 shadow-lg"
              >
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
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Aspirantes</th>
              <th className="px-4 py-3 font-medium">Aprobado</th>
              <th className="px-4 py-3 font-medium">PDV solicitud</th>
              <th className="px-4 py-3 font-medium">Capacitador</th>
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
                <td className="px-4 py-3"><EstadoProcesoBadge estado={s.estado_proceso} /></td>
                <td className="px-4 py-3 text-neutral-600">{s.num_aspirantes ?? 0}</td>
                <td className="px-4 py-3 text-neutral-600">{s.aspirante_aprobado ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{s.pdv_solicitud ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{s.capacitador ?? "—"}</td>
              </tr>
            ))}
            {seguimientos.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-neutral-400">
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
