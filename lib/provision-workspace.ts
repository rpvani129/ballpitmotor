import type { SupabaseClient, User } from "@supabase/supabase-js";
import { DEFAULT_CHECKLIST_ITEMS, DEFAULT_EVENT_TYPES, DEFAULT_TEAMS, DEFAULT_TRACKS } from "@/lib/workspace-defaults";

export async function provisionWorkspace(supabase: SupabaseClient, user: User) {
  const { data: existing } = await supabase.from("memberships").select("workspace_id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
  if (existing?.workspace_id) return existing.workspace_id;

  const { data: profile } = await supabase.from("user_profiles").select("driver_name,team_name").eq("user_id", user.id).maybeSingle();
  const workspaceName = profile?.team_name || (profile?.driver_name ? `${profile.driver_name}'s Garage` : "My Grid");
  const { data: workspaceId, error } = await supabase.rpc("create_workspace", {
    workspace_name: workspaceName,
    workspace_slug: `grid-${user.id.slice(0, 8)}`,
  });
  if (error || !workspaceId) throw error ?? new Error("Workspace could not be created.");

  await supabase.from("event_settings").insert({ workspace_id: workspaceId, show_first_time_popup: true });
  await supabase.from("event_note_categories").insert(
    ["General", "Plan", "Setup", "Driver Feedback", "Incident", "Follow-up"].map((name) => ({ workspace_id: workspaceId, name })),
  );
  await supabase.from("event_types").insert(DEFAULT_EVENT_TYPES.map((name) => ({ workspace_id: workspaceId, name })));
  await supabase.from("teams").insert(DEFAULT_TEAMS.map((name) => ({ workspace_id: workspaceId, name })));

  for (const { configurations, ...track } of DEFAULT_TRACKS) {
    const { data: createdTrack, error: trackError } = await supabase.from("tracks").insert({ workspace_id: workspaceId, ...track }).select("id").single();
    if (trackError || !createdTrack) throw trackError ?? new Error(`Could not create ${track.name}.`);
    const { error: configurationError } = await supabase.from("track_configurations").insert(
      configurations.map((configuration) => ({ workspace_id: workspaceId, track_id: createdTrack.id, ...configuration })),
    );
    if (configurationError) throw configurationError;
  }

  const { data: template, error: templateError } = await supabase.from("checklist_templates")
    .insert({ workspace_id: workspaceId, name: "Pre-Event Safety", version: 1, is_active: true }).select("id").single();
  if (templateError || !template) throw templateError ?? new Error("Checklist template could not be created.");
  const { error: itemError } = await supabase.from("checklist_template_items").insert(
    DEFAULT_CHECKLIST_ITEMS.map((label, position) => ({ workspace_id: workspaceId, template_id: template.id, position, label, response_type: "boolean", is_required: true })),
  );
  if (itemError) throw itemError;

  return workspaceId;
}
