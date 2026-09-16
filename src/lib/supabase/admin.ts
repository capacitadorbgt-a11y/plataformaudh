import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con la clave de servicio (service_role). SOLO se debe usar dentro
// de Server Actions que ya verificaron que el usuario es admin_udh: este
// cliente ignora RLS por completo. "server-only" evita que el archivo se
// importe por accidente desde un componente cliente.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
