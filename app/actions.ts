"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { eventBusinessId, parseLap, TRACKS } from "@/lib/grid";
import { getEventWeather } from "@/lib/weather";

async function authContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase
    .from("memberships")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return { supabase, user, membership };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createBallPitWorkspace() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workspaceId, error } = await supabase.rpc("create_workspace", {
    workspace_name: "Ball Pit Motorsports",
    workspace_slug: `ball-pit-motorsports-${user.id.slice(0, 8)}`,
  });
  if (error || !workspaceId) redirect("/dashboard?error=workspace");

  await supabase.from("vehicles").insert([
    { workspace_id: workspaceId, business_id: "GB", name: "Golf Ball" },
    { workspace_id: workspaceId, business_id: "CB", name: "Cheese Ball" },
    { workspace_id: workspaceId, business_id: "LB", name: "Low Ball" },
  ]);

  const { data: template } = await supabase
    .from("checklist_templates")
    .insert({ workspace_id: workspaceId, name: "Pre-Event Safety", version: 1 })
    .select("id")
    .single();
  if (template) {
    const labels = [
      "Wheel torque and tire pressures checked",
      "Brake pads, rotors and fluid checked",
      "Fluids topped off and no leaks found",
      "Battery, cameras and data system secured",
      "Helmet, HANS, belts and safety gear packed",
      "Tech sheet completed",
    ];
    await supabase.from("checklist_template_items").insert(
      labels.map((label, position) => ({
        workspace_id: workspaceId,
        template_id: template.id,
        position,
        label,
      })),
    );
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function createVehicle(formData: FormData) {
  const { supabase, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const name = String(formData.get("name") ?? "").trim();
  const businessId = String(formData.get("business_id") ?? "").trim().toUpperCase();
  if (!name || !businessId) redirect("/dashboard/vehicles?error=required");
  await supabase.from("vehicles").insert({
    workspace_id: membership.workspace_id,
    name,
    business_id: businessId,
  });
  revalidatePath("/dashboard/vehicles");
}

export async function createEvent(formData: FormData) {
  const { supabase, user, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const vehicleId = String(formData.get("vehicle_id") ?? "");
  const date = String(formData.get("event_date") ?? "");
  const trackName = String(formData.get("track_name") ?? "");
  const configuration = String(formData.get("configuration_name") ?? "");
  const eventName = String(formData.get("event_name") ?? "").trim();
  const track = TRACKS.find((item) => item.name === trackName);
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id, name")
    .eq("workspace_id", membership.workspace_id)
    .eq("id", vehicleId)
    .single();
  if (!track || !vehicle || !date || !eventName || !track.configurations.includes(configuration as never)) {
    redirect("/dashboard/events/new?error=required");
  }

  const weather = await getEventWeather(date, track.latitude, track.longitude);
  const businessIdPrefix = eventBusinessId(vehicle.name, date).slice(0, -2);
  const { count: sameDayCount } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", membership.workspace_id)
    .like("business_id", `${businessIdPrefix}%`);
  const businessId = eventBusinessId(vehicle.name, date, (sameDayCount ?? 0) + 1);
  const payload = {
    workspace_id: membership.workspace_id,
    business_id: businessId,
    event_date: date,
    event_name: eventName,
    track_name: track.name,
    configuration_name: configuration,
    organization_name: String(formData.get("organization_name") ?? "").trim() || null,
    event_type: String(formData.get("event_type") ?? "").trim() || null,
    team_name: String(formData.get("team_name") ?? "").trim() || "Ball Pit Motor",
    driver_name: String(formData.get("driver_name") ?? "").trim() || null,
    vehicle_id: vehicle.id,
    tire_set_business_id: String(formData.get("tire_set_business_id") ?? "").trim() || null,
    front_pad_set_business_id: String(formData.get("front_pad_set_business_id") ?? "").trim() || null,
    rear_pad_set_business_id: String(formData.get("rear_pad_set_business_id") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    created_by: user.id,
    ...(weather ?? {}),
  };
  const { data: event, error } = await supabase.from("events").insert(payload).select("id").single();
  if (error || !event) redirect("/dashboard/events/new?error=create");
  revalidatePath("/dashboard");
  redirect(`/dashboard/events/${event.id}`);
}

export async function addSession(formData: FormData) {
  const { supabase, user, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const eventId = String(formData.get("event_id") ?? "");
  const sessionNumber = Number(formData.get("session_number"));
  const bestLap = parseLap(String(formData.get("best_lap") ?? ""));
  if (!eventId || !sessionNumber || !bestLap) redirect(`/dashboard/events/${eventId}?error=session`);
  const { error } = await supabase.from("sessions").insert({
    workspace_id: membership.workspace_id,
    event_id: eventId,
    session_number: sessionNumber,
    started_at: String(formData.get("started_at") ?? "") || null,
    best_lap_ms: bestLap,
    source_url: String(formData.get("source_url") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    created_by: user.id,
  });
  if (error) redirect(`/dashboard/events/${eventId}?error=session`);
  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function startChecklist(formData: FormData) {
  const { supabase, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const eventId = String(formData.get("event_id") ?? "");
  const vehicleId = String(formData.get("vehicle_id") ?? "") || null;
  const { data: template } = await supabase
    .from("checklist_templates")
    .select("id, version, checklist_template_items(id, label, position, is_required)")
    .eq("workspace_id", membership.workspace_id)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .single();
  if (!template) redirect(`/dashboard/events/${eventId}?error=checklist`);
  const { data: run } = await supabase.from("checklist_runs").insert({
    workspace_id: membership.workspace_id,
    event_id: eventId,
    vehicle_id: vehicleId,
    template_id: template.id,
    template_version: template.version,
    template_snapshot: template.checklist_template_items,
  }).select("id").single();
  if (!run) redirect(`/dashboard/events/${eventId}?error=checklist`);
  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function completeChecklist(formData: FormData) {
  const { supabase, user, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const eventId = String(formData.get("event_id") ?? "");
  const runId = String(formData.get("run_id") ?? "");
  const { data: run } = await supabase
    .from("checklist_runs")
    .select("template_snapshot")
    .eq("workspace_id", membership.workspace_id)
    .eq("id", runId)
    .single();
  const items = Array.isArray(run?.template_snapshot) ? run.template_snapshot : [];
  await supabase.from("checklist_item_results").delete().eq("checklist_run_id", runId);
  await supabase.from("checklist_item_results").insert(
    items.map((item: { id: string }) => ({
      workspace_id: membership.workspace_id,
      checklist_run_id: runId,
      template_item_id: item.id,
      response: { checked: formData.get(`item_${item.id}`) === "on" },
      completed_by: user.id,
      completed_at: new Date().toISOString(),
    })),
  );
  await supabase.from("checklist_runs").update({ status: "complete" }).eq("id", runId);
  revalidatePath(`/dashboard/events/${eventId}`);
}
