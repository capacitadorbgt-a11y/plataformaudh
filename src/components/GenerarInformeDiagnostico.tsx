"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { actualizarEstadoDesdeInforme, uploadInforme } from "@/app/(app)/escuelas/actions";
import { useSaveWithModal } from "@/lib/useSaveWithModal";
import type { Escuela } from "@/types/database";

export default function GenerarInformeDiagnostico({ escuela }: { escuela: Escuela }) {
  const { showModal, error, isPending, run, goToEscuelas } = useSaveWithModal();
  const [mensajeEstado, setMensajeEstado] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;

    setMensajeEstado(null);

    run(async () => {
      try {
        const { parseInformeExcel } = await import("@/lib/informeDiagnosticoDatos");
        const { generarInformePDF } = await import("@/lib/informeDiagnosticoPDF");

        const datos = await parseInformeExcel(archivo);
        const { blob, nombreArchivo } = await generarInformePDF({ escuela, datos });

        const formData = new FormData();
        formData.set("archivo", new File([blob], nombreArchivo, { type: "application/pdf" }));
        const resultadoSubida = await uploadInforme(escuela.id, formData);
        if (resultadoSubida?.error) return resultadoSubida;

        if (datos.aptitud) {
          const nuevoEstado = datos.aptitud === "APTO" ? "ACTIVO" : "INACTIVO";
          const resultadoEstado = await actualizarEstadoDesdeInforme(escuela.id, nuevoEstado);
          if (resultadoEstado?.error) {
            setMensajeEstado(
              `El informe indica que el PDV está ${datos.aptitud === "APTO" ? "apto" : "no apto"} para ser Escuela de Formación, pero no se pudo actualizar el estado: ${resultadoEstado.error}`
            );
          } else {
            setMensajeEstado(
              `El informe indica que el PDV está ${datos.aptitud === "APTO" ? "apto" : "no apto"} para ser Escuela de Formación: el estado de la escuela se actualizó a ${nuevoEstado}.`
            );
          }
        }

        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : "No se pudo generar el informe." };
      }
    });
  }

  return (
    <>
      <div className="mb-4">
        <label className={`btn-secondary inline-block cursor-pointer ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
          {isPending ? "Generando informe..." : "Generar informe"}
          <input
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={handleChange}
            disabled={isPending}
          />
        </label>
        <p className="text-xs text-neutral-400 mt-1">
          Sube el Excel de diagnóstico (pestañas DIAGNOSTICO, PLAN y FOTOS) para generar el informe de cumplimiento en PDF.
          Si el informe indica que el PDV está apto o no apto para ser Escuela de Formación, el estado de la escuela se
          actualiza automáticamente (Activo / Inactivo).
        </p>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      {showModal && (
        <Modal title="Informe generado" onClose={goToEscuelas}>
          El informe en PDF quedó guardado en la lista de Informes de esta escuela; ábrelo desde ahí para verlo o descargarlo.
          {mensajeEstado && <p className="mt-2 font-medium">{mensajeEstado}</p>}
        </Modal>
      )}
    </>
  );
}
