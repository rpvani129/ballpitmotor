"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function commitDataManagementImport(formData: FormData) {
  const importId = String(formData.get("import_id") ?? ""); if (!importId) redirect("/dashboard/data-management");
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/login");
  const { error } = await supabase.rpc("commit_data_management_import", { p_import_id: importId });
  if (error) redirect(`/dashboard/data-management/imports/${importId}?error=commit`);
  revalidatePath("/dashboard"); revalidatePath("/dashboard/data-management"); revalidatePath("/dashboard/vehicles"); revalidatePath("/dashboard/consumables"); revalidatePath("/dashboard/tracks");
  redirect("/dashboard/data-management?imported=1");
}
