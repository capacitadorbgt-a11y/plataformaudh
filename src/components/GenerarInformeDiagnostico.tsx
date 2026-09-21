"use client";

import Modal from "@/components/Modal";
import { uploadInforme } from "@/app/(app)/escuelas/actions";
import { useSaveWithModal } from "@/lib/useSaveWithModal";
import type { Escuela } from "@/types/database";

export default function GenerarInformeDiagnostico({ escuela }: { escuela: Escuela }) {
  const { showModal, error, isPending, run, goToEscuelas } = useSaveWithModal();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;

    run(async () => {
      try {
        const { parseInformeExcel } = await import("@/lib/informeDiagnosticoDatos");
        const { generarInformePDF } = await import("@/lib/informeDiagnosticoPDF");

        const datos = await parseInformeExcel(archivo);
        const { blob, nombreArchivo } = await generarInformePDF({ escuela, datos });

        const enlace = document.createElement("a");
        const url = URL.createObjectURL(blob);
        enlace.href = url;
        enlace.download = nombreArchivo;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        URL.revokeObjectURL(url);

        const formData = new FormData();
        formData.set("archivo", new File([blob], nombreArchivo, { type: "application/pdf" }));
        return await uploadInforme(escuela.id, formData);
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
        </p>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      {showModal && (
        <Modal title="Informe generado" onClose={goToEscuelas}>
          El informe en PDF se descargó y también quedó guardado en la lista de Informes.
        </Modal>
      )}
    </>
  );
}
