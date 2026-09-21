"use client";

import Modal from "@/components/Modal";
import { uploadInforme } from "@/app/(app)/escuelas/actions";
import { useSaveWithModal } from "@/lib/useSaveWithModal";

export default function AgregarInformeButton({ escuelaId }: { escuelaId: string }) {
  const { showModal, error, isPending, run, goToEscuelas } = useSaveWithModal();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;

    run(async () => {
      const formData = new FormData();
      formData.set("archivo", archivo);
      return uploadInforme(escuelaId, formData);
    });
  }

  return (
    <>
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
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      {showModal && (
        <Modal title="Datos guardados" onClose={goToEscuelas}>
          El informe se cargó correctamente.
        </Modal>
      )}
    </>
  );
}
