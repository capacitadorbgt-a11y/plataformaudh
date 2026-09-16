"use client";

import { useRef } from "react";
import Modal from "@/components/Modal";
import { createUsuario } from "@/app/(app)/usuarios/actions";
import { useSaveWithModal } from "@/lib/useSaveWithModal";

export default function UsuarioCreateForm() {
  const { showModal, error, isPending, run, closeModal } = useSaveWithModal();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    run(() => createUsuario(formData), () => formRef.current?.reset());
  }

  return (
    <div className="card p-6">
      <h2 className="font-semibold mb-4">Nuevo usuario</h2>
      <form ref={formRef} action={handleSubmit} className="grid sm:grid-cols-4 gap-3 items-end">
        <div>
          <label className="label">Nombre</label>
          <input className="input" name="nombre" required />
        </div>
        <div>
          <label className="label">Correo</label>
          <input className="input" type="email" name="email" required />
        </div>
        <div>
          <label className="label">Contraseña temporal</label>
          <input className="input" type="text" name="password" required minLength={8} />
        </div>
        <div>
          <label className="label">Rol</label>
          <select className="input" name="role" defaultValue="analista">
            <option value="analista">Analista</option>
            <option value="admin_udh">Admin UDH</option>
          </select>
        </div>
        <div className="sm:col-span-4">
          <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-50">
            {isPending ? "Creando..." : "+ Crear usuario"}
          </button>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
      </form>

      {showModal && (
        <Modal title="Usuario creado" onClose={closeModal}>
          La cuenta se creó correctamente. Comparte el correo y la contraseña con la persona para que inicie sesión.
        </Modal>
      )}
    </div>
  );
}
