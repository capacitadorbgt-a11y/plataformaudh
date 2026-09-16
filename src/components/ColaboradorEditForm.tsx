"use client";

import { useTransition } from "react";
import Modal from "@/components/Modal";
import { RolBadge } from "@/components/Badge";
import { updateColaborador, deleteColaborador } from "@/app/(app)/escuelas/actions";
import { useSaveWithModal } from "@/lib/useSaveWithModal";
import type { Colaborador } from "@/types/database";

export default function ColaboradorEditForm({
  escuelaId,
  colaborador,
}: {
  escuelaId: string;
  colaborador: Colaborador;
}) {
  const { showModal, error, isPending, run, goToEscuelas } = useSaveWithModal();
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    run(() => updateColaborador(escuelaId, colaborador.id, formData));
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar a ${colaborador.nombre}?`)) return;
    startDeleteTransition(async () => {
      await deleteColaborador(escuelaId, colaborador.id);
    });
  }

  return (
    <div className="border border-neutral-100 rounded-lg p-3">
      <form action={handleSubmit} className="grid sm:grid-cols-5 gap-3 items-end">
        <div className="sm:col-span-2">
          <label className="label">Nombre</label>
          <input className="input" name="nombre" defaultValue={colaborador.nombre} required />
        </div>
        <div>
          <label className="label">Rol</label>
          <select className="input" name="rol" defaultValue={colaborador.rol}>
            <option value="ADMIN">ADMIN</option>
            <option value="POLI">POLI</option>
            <option value="OTRO">OTRO</option>
          </select>
        </div>
        <div>
          <label className="label">Cédula</label>
          <input className="input" name="cedula" defaultValue={colaborador.cedula ?? ""} />
        </div>
        <div>
          <label className="label">Fecha de ingreso</label>
          <input
            className="input"
            type="date"
            name="fecha_ingreso"
            defaultValue={colaborador.fecha_ingreso ?? ""}
          />
        </div>
        <div className="sm:col-span-4">
          <label className="label">Datos bancarios (banco, cuenta)</label>
          <input className="input" name="datos_bancarios" defaultValue={colaborador.datos_bancarios ?? ""} />
        </div>
        <div>
          <button type="submit" disabled={isPending} className="btn-secondary w-full disabled:opacity-50">
            {isPending ? "Guardando..." : "Guardar"}
          </button>
        </div>

        {error && <p className="sm:col-span-5 text-sm text-red-600">{error}</p>}

        <div className="sm:col-span-5 flex justify-between items-center pt-1">
          <RolBadge rol={colaborador.rol} />
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending || isDeleting}
            className="text-xs text-red-500 hover:underline disabled:opacity-50"
          >
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </form>

      {showModal && (
        <Modal title="Datos guardados" onClose={goToEscuelas}>
          La información del colaborador se guardó correctamente.
        </Modal>
      )}
    </div>
  );
}
