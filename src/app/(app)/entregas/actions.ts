"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function toNullableInt(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s === "" ? null : parseInt(s, 10);
}
function toNullableStr(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

export async function createEntrega(formData: FormData) {
  const { user } = await requirePermiso("entregas");
  const supabase = createClient();

  const escuelaId = toNullableStr(formData.get("escuela_id"));
  if (!escuelaId) {
    redirect(`/entregas/nueva?error=${encodeURIComponent("Selecciona una escuela")}`);
  }

  const { error } = await supabase.from("entregas").insert({
    escuela_id: escuelaId,
    tipo: String(formData.get("tipo") || "OTRO"),
    cantidad: toNullableInt(formData.get("cantidad")),
    detalle: toNullableStr(formData.get("detalle")),
    fecha: toNullableStr(formData.get("fecha")),
    created_by: user.id,
  });

  if (error) {
    redirect(`/entregas/nueva?error=${encodeURIComponent(error.message)}`);
  }

  await logAudit(user.id, "registrar_entrega", { entidad: "escuela", entidadId: escuelaId });

  revalidatePath("/entregas");
  redirect("/entregas");
}

export async function updateEntrega(id: string, formData: FormData) {
  const { user } = await requirePermiso("entregas");
  const supabase = createClient();

  const escuelaId = toNullableStr(formData.get("escuela_id"));
  if (!escuelaId) {
    redirect(`/entregas/${id}/editar?error=${encodeURIComponent("Selecciona una escuela")}`);
  }

  const { error } = await supabase
    .from("entregas")
    .update({
      escuela_id: escuelaId,
      tipo: String(formData.get("tipo") || "OTRO"),
      cantidad: toNullableInt(formData.get("cantidad")),
      detalle: toNullableStr(formData.get("detalle")),
      fecha: toNullableStr(formData.get("fecha")),
    })
    .eq("id", id);

  if (error) {
    redirect(`/entregas/${id}/editar?error=${encodeURIComponent(error.message)}`);
  }

  await logAudit(user.id, "editar_entrega", { entidad: "entrega", entidadId: id });

  revalidatePath("/entregas");
  redirect("/entregas");
}
