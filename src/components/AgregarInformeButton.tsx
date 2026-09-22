"use client";

import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { createClient } from "@/lib/supabase/client";
import { subirInformeCliente } from "@/lib/informesCliente";
import { useSaveWithModal } from "@/lib/useSaveWithModal";

export default function AgregarInformeButton({ escuelaId, creadoPor }: { escuelaId: string; creadoPor: string }) {
  const { showModal, error, isPending, run, closeModal } = useSaveWithModal();
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;

    run(
      () => subirInformeCliente(createClient(), escuelaId, archivo, creadoPor),
      () => router.refresh()
    );
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
        <Modal title="Datos guardados" onClose={closeModal}>
          El informe se cargó correctamente y ya aparece en la lista de Informes.
        </Modal>
      )}
    </>
  );
}
