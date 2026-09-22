"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { actualizarEstadoDesdeInforme } from "@/app/(app)/escuelas/actions";
import { createClient } from "@/lib/supabase/client";
import { subirInformeCliente } from "@/lib/informesCliente";
import { useSaveWithModal } from "@/lib/useSaveWithModal";

type AptitudSeleccionada = "" | "APTO" | "NO_APTO";

export default function AgregarInformeButton({ escuelaId, creadoPor }: { escuelaId: string; creadoPor: string }) {
  const { showModal, error, isPending, run, closeModal } = useSaveWithModal();
  const [aptitud, setAptitud] = useState<AptitudSeleccionada>("");
  const [mensajeEstado, setMensajeEstado] = useState<string | null>(null);
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;

    setMensajeEstado(null);

    run(
      async () => {
        const supabase = createClient();
        const resultadoSubida = await subirInformeCliente(supabase, escuelaId, archivo, creadoPor);
        if (resultadoSubida.error) return resultadoSubida;

        if (aptitud) {
          const nuevoEstado = aptitud === "APTO" ? "ACTIVO" : "INACTIVO";
          const resultadoEstado = await actualizarEstadoDesdeInforme(escuelaId, nuevoEstado);
          if (resultadoEstado?.error) {
            setMensajeEstado(
              `El informe indica que el PDV está ${aptitud === "APTO" ? "apto" : "no apto"} para ser Escuela de Formación, pero no se pudo actualizar el estado: ${resultadoEstado.error}`
            );
          } else {
            setMensajeEstado(
              `El informe indica que el PDV está ${aptitud === "APTO" ? "apto" : "no apto"} para ser Escuela de Formación: el estado de la escuela se actualizó a ${nuevoEstado}.`
            );
          }
        }

        return { error: null };
      },
      () => router.refresh()
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="label text-xs">Aptitud del PDV según este informe</label>
          <select
            className="input"
            value={aptitud}
            onChange={(e) => setAptitud(e.target.value as AptitudSeleccionada)}
            disabled={isPending}
          >
            <option value="">No indicar (no cambia el estado)</option>
            <option value="APTO">Apto para ser Escuela de Formación → Activo</option>
            <option value="NO_APTO">No apto para ser Escuela de Formación → Inactivo</option>
          </select>
        </div>
        <label className={`btn-secondary inline-block cursor-pointer ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
          {isPending ? "Subiendo..." : "+ Agregar informe"}
          <input
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleChange}
            disabled={isPending}
          />
        </label>
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      {showModal && (
        <Modal title="Datos guardados" onClose={closeModal}>
          El informe se cargó correctamente y ya aparece en la lista de Informes.
          {mensajeEstado && <p className="mt-2 font-medium">{mensajeEstado}</p>}
        </Modal>
      )}
    </>
  );
}
