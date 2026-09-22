"use client";

import Modal from "@/components/Modal";
import { updateEscuela } from "@/app/(app)/escuelas/actions";
import { useSaveWithModal } from "@/lib/useSaveWithModal";
import type { Escuela } from "@/types/database";

export default function EscuelaFichaForm({ escuela }: { escuela: Escuela }) {
  const { showModal, error, isPending, run, goToEscuelas } = useSaveWithModal();

  function handleSubmit(formData: FormData) {
    run(() => updateEscuela(escuela.id, formData));
  }

  return (
    <>
      <form key={escuela.updated_at} action={handleSubmit} className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Provincia</label>
          <input className="input" name="provincia" defaultValue={escuela.provincia ?? ""} />
        </div>
        <div>
          <label className="label">Ciudad</label>
          <input className="input" name="ciudad" defaultValue={escuela.ciudad ?? ""} />
        </div>
        <div>
          <label className="label">Zona</label>
          <input className="input" name="zona" defaultValue={escuela.zona ?? ""} />
        </div>
        <div>
          <label className="label">Capacidad</label>
          <input className="input" type="number" name="capacidad" defaultValue={escuela.capacidad ?? ""} />
        </div>
        <div>
          <label className="label">Estado</label>
          <select className="input" name="estado" defaultValue={escuela.estado}>
            <option value="ACTIVO">ACTIVO</option>
            <option value="REVISION">REVISION</option>
            <option value="INACTIVO">INACTIVO</option>
          </select>
        </div>
        <div>
          <label className="label">Procesos completados</label>
          <input
            className="input"
            type="number"
            name="procesos_completados"
            defaultValue={escuela.procesos_completados ?? 0}
          />
        </div>
        <div>
          <label className="label">Fecha última visita</label>
          <input
            className="input"
            type="date"
            name="fecha_ultima_visita"
            defaultValue={escuela.fecha_ultima_visita ?? ""}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Observaciones</label>
          <textarea className="input" name="observaciones" rows={3} defaultValue={escuela.observaciones ?? ""} />
        </div>

        {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}

        <div className="sm:col-span-2">
          <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-50">
            {isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>

      {showModal && (
        <Modal title="Datos guardados" onClose={goToEscuelas}>
          La información de la escuela se guardó correctamente.
        </Modal>
      )}
    </>
  );
}
