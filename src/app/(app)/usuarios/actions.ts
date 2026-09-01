"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateUserRole(userId: string, formData: FormData) {
  await requireAdmin();
  const supabase = createClient();

  await supabase
    .from("profiles")
    .update({ role: String(formData.get("role")) })
    .eq("id", userId);

  revalidatePath("/usuarios");
}
