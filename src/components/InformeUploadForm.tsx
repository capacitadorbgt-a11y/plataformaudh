"use client";

import { useRef } from "react";
import Modal from "@/components/Modal";
import { uploadInforme } from "@/app/(app)/escuelas/actions";
import { useSaveWithModal } from "@/lib/useSaveWithModal";

export default function InformeUploadForm({ escuelaId }: { escuelaId: string }) {
  const { showModal, error, isPending, run, goToEscuelas } = useSaveWithModal();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    run(() => uploadInforme(escuelaId, formData), () => formRef.current?.reset());
  }

  return (
    <>
      <form
        ref={formRef}
        action={handleSubmit}
        encType="multipart/form-data"
        className="border-t border-neutral-100 pt-4 space-y-3"
      >
        <div>
          <label className="label">Archivo (PDF, Word o Excel)</label>
          <input
            className="input"
            type="file"
            name="archivo"
            accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-50">
          {isPending ? "Guardando..." : "Guardar"}
        </button>
      </form>

      {showModal && (
        <Modal title="Datos guardados" onClose={goToEscuelas}>
          El informe se cargó correctamente.
        </Modal>
      )}
    </>
  );
}
