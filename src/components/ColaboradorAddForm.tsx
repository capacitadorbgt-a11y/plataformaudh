"use client";

import { useRef } from "react";
import Modal from "@/components/Modal";
import { addColaborador } from "@/app/(app)/escuelas/actions";
import { useSaveWithModal } from "@/lib/useSaveWithModal";

export default function ColaboradorAddForm({ escuelaId }: { escuelaId: string }) {
  const { showModal, error, isPending, run, goToEscuelas } = useSaveWithModal();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    run(() => addColaborador(escuelaId, formData), () => formRef.current?.reset());
  }

  return (
    <>
      <form
        ref={formRef}
        action={handleSubmit}
        className="grid sm:grid-cols-4 gap-3 items-end border-t border-neutral-100 pt-4"
      >
        <div className="sm:col-span-2">
          <label className="label">Nombre</label>
          <input className="input" name="nombre" required />
        </div>
        <div>
          <label className="label">Rol</label>
          <select className="input" name="rol" defaultValue="ADMIN">
            <option value="ADMIN">ADMIN</option>
            <option value="POLI">POLI</option>
            <option value="OTRO">OTRO</option>
          </select>
        </div>
        <div>
          <label className="label">Cédula</label>
          <input className="input" name="cedula" />
        </div>
        <div>
          <label className="label">Fecha de ingreso</label>
          <input className="input" type="date" name="fecha_ingreso" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Datos bancarios (banco, cuenta)</label>
          <input className="input" name="datos_bancarios" />
        </div>
        <div>
          <button type="submit" disabled={isPending} className="btn-secondary w-full disabled:opacity-50">
            {isPending ? "Agregando..." : "+ Agregar colaborador"}
          </button>
        </div>

        {error && <p className="sm:col-span-4 text-sm text-red-600">{error}</p>}
      </form>

      {showModal && (
        <Modal title="Datos guardados" onClose={goToEscuelas}>
          El colaborador se agregó correctamente.
        </Modal>
      )}
    </>
  );
}
