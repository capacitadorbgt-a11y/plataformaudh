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

  return { user, profile };
}

export async function requireAdmin() {
  const { user, profile } = await requireUser();
  if (profile.role !== "admin_udh") redirect("/");
  return { user, profile };
}
