"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

function toNullableStr(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

export async function updateUserRole(userId: string, formData: FormData) {
  const { user: admin } = await requireAdmin();
  const supabase = createClient();
  const nuevoRol = String(formData.get("role"));

  await supabase.from("profiles").update({ role: nuevoRol }).eq("id", userId);

  await logAudit(admin.id, "cambiar_rol", {
    entidad: "usuario",
    entidadId: userId,
    detalle: `Nuevo rol: ${nuevoRol}`,
  });

  revalidatePath("/usuarios");
}

export async function createUsuario(formData: FormData) {
  const { user: admin } = await requireAdmin();

  const email = toNullableStr(formData.get("email"));
  const password = toNullableStr(formData.get("password"));
  const nombre = toNullableStr(formData.get("nombre")) ?? email ?? "Usuario UDH";
  const role = String(formData.get("role") || "analista");

  if (!email || !password) {
    return { error: "Correo y contraseña son obligatorios" };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  });

  if (error) {
    return { error: error.message };
  }

  const nuevoUserId = data.user.id;

  // el trigger handle_new_user ya creo el perfil con rol "analista";
  // se actualiza el nombre/rol solo si el admin eligio algo distinto
  await adminClient.from("profiles").update({ nombre, role }).eq("id", nuevoUserId);

  await logAudit(admin.id, "crear_usuario", {
    entidad: "usuario",
    entidadId: nuevoUserId,
    detalle: `${nombre} (${email}) · rol: ${role}`,
  });

  revalidatePath("/usuarios");
  return { error: null };
}

export async function toggleUsuarioActivo(userId: string, activo: boolean) {
  const { user: admin } = await requireAdmin();

  if (userId === admin.id && !activo) {
    return { error: "No puedes desactivar tu propia cuenta" };
  }

  const adminClient = createAdminClient();

  // ban_duration bloquea el inicio de sesion en Supabase Auth de forma real;
  // "none" quita el bloqueo
  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: activo ? "none" : "876000h",
  });

  if (authError) {
    return { error: authError.message };
  }

  const { error } = await adminClient.from("profiles").update({ activo }).eq("id", userId);

  if (error) return { error: error.message };

  await logAudit(admin.id, activo ? "activar_usuario" : "desactivar_usuario", {
    entidad: "usuario",
    entidadId: userId,
  });

  revalidatePath("/usuarios");
  return { error: null };
}

export async function updateUsuarioPermisos(userId: string, formData: FormData) {
  const { user: admin } = await requireAdmin();
  const supabase = createClient();

  const permisos = {
    escuelas: formData.get("permiso_escuelas") === "on",
    seguimientos: formData.get("permiso_seguimientos") === "on",
    entregas: formData.get("permiso_entregas") === "on",
    encuestas: formData.get("permiso_encuestas") === "on",
  };

  const { error } = await supabase.from("profiles").update({ permisos }).eq("id", userId);

  if (error) return { error: error.message };

  await logAudit(admin.id, "cambiar_permisos", {
    entidad: "usuario",
    entidadId: userId,
    detalle: JSON.stringify(permisos),
  });

  revalidatePath("/usuarios");
  return { error: null };
}
