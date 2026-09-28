"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { subirInformeCliente } from "@/lib/informesCliente";
import { deleteInformeSeguimiento } from "@/app/(app)/seguimientos/actions";
import { useSaveWithModal } from "@/lib/useSaveWithModal";

export interface InformeSeguimientoItem {
  id: string;
  nombre_archivo: string;
  tamano_bytes: number | null;
  created_at: string;
  storage_path: string;
  url: string | null;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SeguimientoInformeButton({
  seguimientoId,
  informes,
  creadoPor,
  puedeEliminar,
}: {
  seguimientoId: string;
  informes: InformeSeguimientoItem[];
  creadoPor: string;
  puedeEliminar: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const { error, isPending, run } = useSaveWithModal();
  const router = useRouter();

  function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;

    run(
      async () => {
        const supabase = createClient();
        return subirInformeCliente(supabase, { seguimientoId }, archivo, creadoPor);
      },
      () => router.refresh()
    );
  }

  async function handleEliminar(informeId: string, storagePath: string) {
    setEliminandoId(informeId);
    try {
      await deleteInformeSeguimiento(seguimientoId, informeId, storagePath);
      router.refresh();
    } finally {
      setEliminandoId(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setAbierto(true);
        }}
        className="btn-secondary text-xs px-2 py-1"
      >
        + Informe{informes.length > 0 ? ` (${informes.length})` : ""}
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => {
            e.stopPropagation();
            setAbierto(false);
          }}
        >
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Informes del seguimiento</h2>
              <button type="button" onClick={() => setAbierto(false)} className="text-neutral-400 hover:text-neutral-600 text-xl leading-none">
                ×
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {informes.map((inf) => (
                <div key={inf.id} className="flex items-center justify-between border border-neutral-100 rounded-lg px-3 py-2 text-sm">
                  <div className="min-w-0">
                    {inf.url ? (
                      <a href={inf.url} target="_blank" rel="noreferrer" className="font-medium hover:underline text-udh-700 truncate block">
                        {inf.nombre_archivo}
                      </a>
                    ) : (
                      <span className="font-medium">{inf.nombre_archivo}</span>
                    )}
                    <div className="text-xs text-neutral-400">
                      {formatBytes(inf.tamano_bytes)} · {new Date(inf.created_at).toLocaleDateString("es-EC")}
                    </div>
                  </div>
                  {puedeEliminar && (
                    <button
                      type="button"
                      onClick={() => handleEliminar(inf.id, inf.storage_path)}
                      disabled={eliminandoId === inf.id}
                      className="text-xs text-red-500 hover:underline shrink-0 disabled:opacity-50"
                    >
                      {eliminandoId === inf.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  )}
                </div>
              ))}
              {informes.length === 0 && <p className="text-sm text-neutral-400">Sin informes cargados.</p>}
            </div>

            <label className={`btn-secondary inline-block cursor-pointer ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
              {isPending ? "Subiendo..." : "+ Agregar informe"}
              <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleArchivo} disabled={isPending} />
            </label>
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
