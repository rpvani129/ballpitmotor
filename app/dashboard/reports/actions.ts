"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");
  const { data: membership } = await supabase.from("memberships").select("workspace_id").eq("user_id", user.id).eq("status", "active").limit(1).single();
  if (!membership) throw new Error("No active workspace.");
  return { supabase, user, workspaceId: membership.workspace_id };
}

export async function resolveQualityIssue(formData: FormData) {
  const { supabase, user, workspaceId } = await context();
  const issueKey = String(formData.get("issue_key") ?? "");
  const issueType = String(formData.get("issue_type") ?? "");
  const entityType = String(formData.get("entity_type") ?? "");
  const entityId = String(formData.get("entity_id") ?? "");
  const resolution = String(formData.get("resolution") ?? "");
  if (!issueKey || !issueType || !entityId || !["event", "session"].includes(entityType) || !["confirmed", "intentionally_missing"].includes(resolution)) throw new Error("Invalid reconciliation decision.");
  const { error } = await supabase.from("data_quality_reviews").upsert({ workspace_id: workspaceId, issue_key: issueKey, issue_type: issueType, entity_type: entityType, entity_id: entityId, resolution, resolved_by: user.id, resolved_at: new Date().toISOString() }, { onConflict: "workspace_id,issue_key" });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/data-management/quality");
}

export async function reopenQualityIssue(formData: FormData) {
  const { supabase, workspaceId } = await context();
  const issueKey = String(formData.get("issue_key") ?? "");
  if (!issueKey) throw new Error("Invalid reconciliation decision.");
  const { error } = await supabase.from("data_quality_reviews").delete().eq("workspace_id", workspaceId).eq("issue_key", issueKey);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/data-management/quality");
}
