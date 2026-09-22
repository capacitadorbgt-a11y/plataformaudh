// Supabase Storage rechaza ciertas claves (tildes, espacios, etc.) con
// "Invalid key". El nombre original y legible se guarda aparte en
// nombre_archivo; aqui solo se genera una clave segura para el storage.
export function sanitizeStorageKey(nombre: string) {
  const sinAcentos = nombre.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const partes = sinAcentos.split(/(\.[^.]+)$/); // separa la extension
  const base = (partes[0] || "archivo")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const extension = (partes[1] || "").replace(/[^a-zA-Z0-9.]/g, "");
  return (base || "archivo") + extension;
}
