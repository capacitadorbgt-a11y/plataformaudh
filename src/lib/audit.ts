import { createClient } from "@/lib/supabase/server";

export async function logAudit(
  userId: string,
  accion: string,
  opts?: { entidad?: string; entidadId?: string | null; detalle?: string }
) {
  const supabase = createClient();
  await supabase.from("audit_log").insert({
    user_id: userId,
    accion,
    entidad: opts?.entidad ?? null,
    entidad_id: opts?.entidadId ?? null,
    detalle: opts?.detalle ?? null,
  });
}
