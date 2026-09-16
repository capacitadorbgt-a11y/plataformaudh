"use client";

import { useRef } from "react";
import Modal from "@/components/Modal";
import { addEntrega } from "@/app/(app)/escuelas/actions";
import { useSaveWithModal } from "@/lib/useSaveWithModal";

export default function EntregaAddForm({ escuelaId }: { escuelaId: string }) {
  const { showModal, error, isPending, run, goToEscuelas } = useSaveWithModal();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    run(() => addEntrega(escuelaId, formData), () => formRef.current?.reset());
  }

  return (
    <>
      <form
        ref={formRef}
        action={handleSubmit}
        className="grid sm:grid-cols-4 gap-3 items-end border-t border-neutral-100 pt-4"
      >
        <div>
          <label className="label">Tipo</label>
          <select className="input" name="tipo" defaultValue="CAMISETA">
            <option value="CAMISETA">CAMISETA</option>
            <option value="ENTRADA_CINE">ENTRADA CINE</option>
            <option value="CHEQUE">CHEQUE</option>
            <option value="OTRO">OTRO</option>
          </select>
        </div>
        <div>
          <label className="label">Cantidad</label>
          <input className="input" type="number" name="cantidad" min={0} />
        </div>
        <div>
          <label className="label">Fecha</label>
          <input className="input" type="date" name="fecha" />
        </div>
        <div>
          <button type="submit" disabled={isPending} className="btn-secondary w-full disabled:opacity-50">
            {isPending ? "Registrando..." : "Registrar"}
          </button>
        </div>
        <div className="sm:col-span-4">
          <label className="label">Detalle (tallas, banco, etc.)</label>
          <input className="input" name="detalle" />
        </div>

        {error && <p className="sm:col-span-4 text-sm text-red-600">{error}</p>}
      </form>

      {showModal && (
        <Modal title="Datos guardados" onClose={goToEscuelas}>
          La entrega se registró correctamente.
        </Modal>
      )}
    </>
  );
}
