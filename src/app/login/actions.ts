"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { redirect } from "next/navigation";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("activo")
    .eq("id", data.user.id)
    .single();

  if (profile && !profile.activo) {
    await supabase.auth.signOut();
    redirect(`/login?error=${encodeURIComponent("Tu cuenta fue desactivada. Contacta a un Admin UDH.")}`);
  }

  await logAudit(data.user.id, "iniciar_sesion");

  redirect("/");
}

export async function signOut() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) await logAudit(user.id, "cerrar_sesion");

  await supabase.auth.signOut();
  redirect("/login");
}
