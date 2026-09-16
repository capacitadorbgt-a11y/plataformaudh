import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";
import { redirect } from "next/navigation";

export async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) redirect("/login");

  if (!profile.activo) {
    await supabase.auth.signOut();
    redirect("/login?error=" + encodeURIComponent("Tu cuenta fue desactivada. Contacta a un Admin UDH."));
  }

  return { user, profile };
}

export async function requireAdmin() {
  const { user, profile } = await requireUser();
  if (profile.role !== "admin_udh") redirect("/");
  return { user, profile };
}

export function tienePermiso(
  profile: Profile,
  herramienta: "escuelas" | "seguimientos" | "entregas" | "encuestas"
) {
  if (profile.role === "admin_udh") return true;
  return profile.permisos?.[herramienta] !== false;
}

export async function requirePermiso(herramienta: "escuelas" | "seguimientos" | "entregas" | "encuestas") {
  const { user, profile } = await requireUser();
  if (!tienePermiso(profile, herramienta)) redirect("/");
  return { user, profile };
}
