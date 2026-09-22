import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeStorageKey } from "@/lib/sanitizeStorageKey";

// Sube el informe directo desde el navegador a Supabase Storage (en vez de
// pasar por una Server Action) porque Next.js limita a 1 MB el tamano del
// payload de una Server Action por defecto, y los PDF generados (con fotos
// incrustadas) superan facilmente varios MB. Subir asi evita ese limite;
// las policies RLS ya permiten a cualquier autenticado subir/insertar.
export async function subirInformeCliente(
  supabase: SupabaseClient,
  escuelaId: string,
  archivo: File,
  creadoPor: string
): Promise<{ error: string | null }> {
  if (archivo.size === 0) {
    return { error: "Selecciona un archivo para subir" };
  }
  if (archivo.type && archivo.type !== "application/pdf") {
    return { error: "Tipo de archivo no permitido. Sube un documento en formato PDF." };
  }

  const rutaStorage = `${escuelaId}/${Date.now()}-${sanitizeStorageKey(archivo.name)}`;
  const { error: uploadError } = await supabase.storage.from("informes").upload(rutaStorage, archivo, {
    contentType: archivo.type || "application/pdf",
  });
  if (uploadError) return { error: uploadError.message };

  const { error: insertError } = await supabase.from("informes").insert({
    escuela_id: escuelaId,
    nombre_archivo: archivo.name,
    tipo_archivo: archivo.type || "application/pdf",
    storage_path: rutaStorage,
    tamano_bytes: archivo.size,
    created_by: creadoPor,
  });
  if (insertError) {
    await supabase.storage.from("informes").remove([rutaStorage]);
    return { error: insertError.message };
  }

  await supabase.from("audit_log").insert({
    user_id: creadoPor,
    accion: "subir_informe",
    entidad: "escuela",
    entidad_id: escuelaId,
    detalle: archivo.name,
  });

  return { error: null };
}
