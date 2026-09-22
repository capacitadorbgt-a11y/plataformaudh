"use client";

import { useState, useTransition } from "react";
import { updateUserRole, toggleUsuarioActivo, updateUsuarioPermisos, updateUsuarioPassword } from "@/app/(app)/usuarios/actions";
import { useSaveWithModal } from "@/lib/useSaveWithModal";
import type { Profile } from "@/types/database";

export default function UsuarioRow({
  usuario,
  esUsuarioActual,
}: {
  usuario: Profile;
  esUsuarioActual: boolean;
}) {
  const rol = useSaveWithModal();
  const permisos = useSaveWithModal();
  const password = useSaveWithModal();
  const [isToggling, startToggle] = useTransition();
  const [mostrarPassword, setMostrarPassword] = useState(false);

  function handleRolSubmit(formData: FormData) {
    rol.run(() => updateUserRole(usuario.id, formData));
  }

  function handlePasswordSubmit(formData: FormData) {
    password.run(
      () => updateUsuarioPassword(usuario.id, formData),
      () => setMostrarPassword(false)
    );
  }

  function handlePermisosSubmit(formData: FormData) {
    permisos.run(() => updateUsuarioPermisos(usuario.id, formData));
  }

  function handleToggleActivo() {
    const accion = usuario.activo ? "desactivar" : "activar";
    if (!confirm(`¿Seguro que quieres ${accion} a ${usuario.nombre}?`)) return;
    startToggle(async () => {
      await toggleUsuarioActivo(usuario.id, !usuario.activo);
    });
  }

  return (
    <tr className="border-b border-neutral-100 last:border-0 align-top">
      <td className="px-4 py-3 font-medium">
        {usuario.nombre} {esUsuarioActual && <span className="text-xs text-neutral-400">(tú)</span>}
        <div className="mt-1">
          <span
            className={`badge ${usuario.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
          >
            {usuario.activo ? "Activo" : "Inactivo"}
          </span>
        </div>
      </td>

      <td className="px-4 py-3">
        <form action={handleRolSubmit} className="flex gap-2 items-center">
          <select className="input" name="role" defaultValue={usuario.role} disabled={esUsuarioActual}>
            <option value="admin_udh">Admin UDH</option>
            <option value="analista">Analista</option>
          </select>
          <button type="submit" disabled={rol.isPending || esUsuarioActual} className="btn-secondary text-xs disabled:opacity-50">
            {rol.isPending ? "..." : "Guardar"}
          </button>
        </form>
        {rol.error && <p className="text-xs text-red-600 mt-1">{rol.error}</p>}
      </td>

      <td className="px-4 py-3">
        <form action={handlePermisosSubmit} className="space-y-1">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" name="permiso_escuelas" defaultChecked={usuario.permisos?.escuelas !== false} />
            Escuelas
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" name="permiso_seguimientos" defaultChecked={usuario.permisos?.seguimientos !== false} />
            Seguimientos
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" name="permiso_entregas" defaultChecked={usuario.permisos?.entregas !== false} />
            Recompensas y material
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" name="permiso_encuestas" defaultChecked={usuario.permisos?.encuestas !== false} />
            Encuestas
          </label>
          <button type="submit" disabled={permisos.isPending} className="btn-secondary text-xs mt-1 disabled:opacity-50">
            {permisos.isPending ? "Guardando..." : "Guardar permisos"}
          </button>
        </form>
        {permisos.error && <p className="text-xs text-red-600 mt-1">{permisos.error}</p>}
      </td>

      <td className="px-4 py-3">
        <button
          type="button"
          onClick={handleToggleActivo}
          disabled={isToggling || esUsuarioActual}
          className={`text-xs hover:underline disabled:opacity-50 ${
            usuario.activo ? "text-red-500" : "text-green-600"
          }`}
        >
          {isToggling ? "..." : usuario.activo ? "Desactivar acceso" : "Activar acceso"}
        </button>

        <div className="mt-2">
          {!mostrarPassword ? (
            <button
              type="button"
              onClick={() => setMostrarPassword(true)}
              className="text-xs text-udh-600 hover:underline"
            >
              Cambiar contraseña
            </button>
          ) : (
            <form action={handlePasswordSubmit} className="space-y-1">
              <input
                className="input text-xs py-1"
                type="password"
                name="password"
                placeholder="Nueva contraseña (mín. 8)"
                minLength={8}
                required
                autoFocus
              />
              <div className="flex gap-2">
                <button type="submit" disabled={password.isPending} className="btn-secondary text-xs disabled:opacity-50">
                  {password.isPending ? "..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarPassword(false)}
                  className="text-xs text-neutral-400 hover:underline"
                >
                  Cancelar
                </button>
              </div>
              {password.error && <p className="text-xs text-red-600">{password.error}</p>}
            </form>
          )}
        </div>
      </td>
    </tr>
  );
}
