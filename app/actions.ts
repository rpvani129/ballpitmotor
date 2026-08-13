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

  for (const track of TRACKS) {
    const { data: createdTrack } = await supabase.from("tracks").insert({
      workspace_id: workspaceId,
      name: track.name,
      short_name: track.shortName,
      latitude: track.latitude,
      longitude: track.longitude,
    }).select("id").single();
    if (createdTrack) {
      await supabase.from("track_configurations").insert(track.configurations.map((name) => ({
        workspace_id: workspaceId,
        track_id: createdTrack.id,
        name,
      })));
    }
  }

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
  const { data: vehicle, error } = await supabase.from("vehicles").insert({
    workspace_id: membership.workspace_id,
    name,
    business_id: businessId,
  }).select("id").single();
  if (error || !vehicle) redirect("/dashboard/vehicles/new?error=save");
  revalidatePath("/dashboard/vehicles");
  redirect(`/dashboard/vehicles/${vehicle.id}`);
}

export async function updateVehicle(formData: FormData) {
  const { supabase, membership } = await authContext();
  const vehicleId = String(formData.get("vehicle_id") ?? "");
  if (!membership || !vehicleId) redirect("/dashboard/vehicles");
  const optionalInteger = (name: string) => {
    const value = String(formData.get(name) ?? "").trim();
    return value ? Number(value) : null;
  };
  const text = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const { error } = await supabase.from("vehicles").update({
    name: String(formData.get("name") ?? "").trim(),
    status: String(formData.get("status") ?? "active"),
    year: optionalInteger("year"),
    make: text("make"),
    model: text("model"),
    trim: text("trim"),
    race_number: text("race_number"),
    competition_class: text("competition_class"),
    description: text("description"),
    wiki_url: text("wiki_url"),
    image_url: text("image_url"),
    current_odometer_miles: optionalInteger("current_odometer_miles"),
    acquired_on: text("acquired_on"),
  }).eq("workspace_id", membership.workspace_id).eq("id", vehicleId);
  if (error) redirect(`/dashboard/vehicles/${vehicleId}?error=vehicle`);
  revalidatePath(`/dashboard/vehicles/${vehicleId}`);
  revalidatePath("/dashboard/vehicles");
  redirect(`/dashboard/vehicles/${vehicleId}`);
}

export async function addMaintenanceRecord(formData: FormData) {
  const { supabase, membership } = await authContext();
  const vehicleId = String(formData.get("vehicle_id") ?? "");
  if (!membership || !vehicleId) redirect("/dashboard/vehicles");
  const integer = (name: string) => String(formData.get(name) ?? "").trim() ? Number(formData.get(name)) : null;
  const text = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const { error } = await supabase.from("maintenance_records").insert({
    workspace_id: membership.workspace_id,
    vehicle_id: vehicleId,
    service_date: String(formData.get("service_date") ?? ""),
    category: String(formData.get("category") ?? "Maintenance"),
    title: String(formData.get("title") ?? "").trim(),
    description: text("description"),
    odometer_miles: integer("odometer_miles"),
    vendor: text("vendor"),
    cost: integer("cost"),
    next_due_date: text("next_due_date"),
    next_due_miles: integer("next_due_miles"),
    source_url: text("source_url"),
  });
  if (error) redirect(`/dashboard/vehicles/${vehicleId}?error=maintenance`);
  revalidatePath(`/dashboard/vehicles/${vehicleId}`);
  redirect(`/dashboard/vehicles/${vehicleId}`);
}

export async function updateMaintenanceRecord(formData: FormData) {
  const { supabase, membership } = await authContext();
  const id = String(formData.get("id") ?? "");
  const vehicleId = String(formData.get("vehicle_id") ?? "");
  if (!membership || !id || !vehicleId) redirect("/dashboard/vehicles");
  const text = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const numeric = (name: string) => text(name) ? Number(text(name)) : null;
  const { error } = await supabase.from("maintenance_records").update({
    service_date: String(formData.get("service_date") ?? ""),
    category: String(formData.get("category") ?? "Maintenance").trim(),
    title: String(formData.get("title") ?? "").trim(),
    description: text("description"),
    odometer_miles: numeric("odometer_miles"),
    vendor: text("vendor"),
    cost: numeric("cost"),
    next_due_date: text("next_due_date"),
    next_due_miles: numeric("next_due_miles"),
    source_url: text("source_url"),
  }).eq("workspace_id", membership.workspace_id).eq("vehicle_id", vehicleId).eq("id", id);
  if (error) redirect(`/dashboard/vehicles/${vehicleId}?error=maintenance`);
  revalidatePath(`/dashboard/vehicles/${vehicleId}`);
  redirect(`/dashboard/vehicles/${vehicleId}`);
}

export async function addMaintenanceRecordItem(formData: FormData) {
  const { supabase, membership } = await authContext();
  const maintenanceRecordId = String(formData.get("maintenance_record_id") ?? "");
  const vehicleId = String(formData.get("vehicle_id") ?? "");
  if (!membership || !maintenanceRecordId || !vehicleId) redirect("/dashboard/vehicles");
  const text = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const { data: record } = await supabase.from("maintenance_records").select("id")
    .eq("workspace_id", membership.workspace_id).eq("vehicle_id", vehicleId).eq("id", maintenanceRecordId).single();
  if (!record) redirect(`/dashboard/vehicles/${vehicleId}?error=maintenance-item`);
  const { count } = await supabase.from("maintenance_record_items").select("id", { count: "exact", head: true })
    .eq("workspace_id", membership.workspace_id).eq("maintenance_record_id", maintenanceRecordId);
  const { error } = await supabase.from("maintenance_record_items").insert({
    workspace_id: membership.workspace_id,
    maintenance_record_id: maintenanceRecordId,
    position: count ?? 0,
    category: String(formData.get("category") ?? "Maintenance").trim(),
    title: String(formData.get("title") ?? "").trim(),
    details: text("details"),
    quantity: text("quantity"),
    line_amount: text("line_amount") ? Number(text("line_amount")) : null,
    source_item_number: text("source_item_number"),
    status: String(formData.get("status") ?? "Complete").trim(),
  });
  if (error) redirect(`/dashboard/vehicles/${vehicleId}?error=maintenance-item`);
  revalidatePath(`/dashboard/vehicles/${vehicleId}`);
}

export async function updateMaintenanceRecordItem(formData: FormData) {
  const { supabase, membership } = await authContext();
  const id = String(formData.get("id") ?? "");
  const maintenanceRecordId = String(formData.get("maintenance_record_id") ?? "");
  const vehicleId = String(formData.get("vehicle_id") ?? "");
  if (!membership || !id || !maintenanceRecordId || !vehicleId) redirect("/dashboard/vehicles");
  const text = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const { data: record } = await supabase.from("maintenance_records").select("id")
    .eq("workspace_id", membership.workspace_id).eq("vehicle_id", vehicleId).eq("id", maintenanceRecordId).single();
  if (!record) redirect(`/dashboard/vehicles/${vehicleId}?error=maintenance-item`);
  const { error } = await supabase.from("maintenance_record_items").update({
    category: String(formData.get("category") ?? "Maintenance").trim(),
    title: String(formData.get("title") ?? "").trim(),
    details: text("details"),
    quantity: text("quantity"),
    line_amount: text("line_amount") ? Number(text("line_amount")) : null,
    source_item_number: text("source_item_number"),
    status: String(formData.get("status") ?? "Complete").trim(),
  }).eq("workspace_id", membership.workspace_id).eq("maintenance_record_id", maintenanceRecordId).eq("id", id);
  if (error) redirect(`/dashboard/vehicles/${vehicleId}?error=maintenance-item`);
  revalidatePath(`/dashboard/vehicles/${vehicleId}`);
}

export async function createTireSet(formData: FormData) {
  const { supabase, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const vehicleId = String(formData.get("vehicle_id") ?? "");
  const text = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const { error } = await supabase.from("tire_sets").insert({
    workspace_id: membership.workspace_id,
    vehicle_id: vehicleId,
    business_id: String(formData.get("business_id") ?? "").trim().toUpperCase(),
    manufacturer: String(formData.get("manufacturer") ?? "").trim(),
    model: String(formData.get("model") ?? "").trim(),
    size: text("size"), compound: text("compound"), purchased_on: text("purchased_on"),
    starting_sessions: text("starting_sessions") ? Number(text("starting_sessions")) : null,
    notes: text("notes"),
  });
  if (error) redirect("/dashboard/consumables?error=tire");
  revalidatePath("/dashboard/consumables");
}

export async function createPadSet(formData: FormData) {
  const { supabase, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const text = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const { error } = await supabase.from("pad_sets").insert({
    workspace_id: membership.workspace_id,
    vehicle_id: String(formData.get("vehicle_id") ?? ""),
    business_id: String(formData.get("business_id") ?? "").trim().toUpperCase(),
    axle: String(formData.get("axle") ?? ""),
    manufacturer: String(formData.get("manufacturer") ?? "").trim(),
    model: String(formData.get("model") ?? "").trim(),
    compound: text("compound"), purchased_on: text("purchased_on"),
    starting_sessions: text("starting_sessions") ? Number(text("starting_sessions")) : null,
    notes: text("notes"),
  });
  if (error) redirect("/dashboard/consumables?error=pad");
  revalidatePath("/dashboard/consumables");
}

export async function updateTireSet(formData: FormData) {
  const { supabase, membership } = await authContext();
  const id = String(formData.get("id") ?? "");
  if (!membership || !id) redirect("/dashboard/consumables?tab=tires");
  const text = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const { error } = await supabase.from("tire_sets").update({
    vehicle_id: String(formData.get("vehicle_id") ?? ""),
    business_id: String(formData.get("business_id") ?? "").trim().toUpperCase(),
    manufacturer: String(formData.get("manufacturer") ?? "").trim(),
    model: String(formData.get("model") ?? "").trim(),
    size: text("size"),
    compound: text("compound"),
    purchased_on: text("purchased_on"),
    starting_sessions: text("starting_sessions") ? Number(text("starting_sessions")) : null,
    status: String(formData.get("status") ?? "active"),
    notes: text("notes"),
  }).eq("workspace_id", membership.workspace_id).eq("id", id);
  if (error) redirect("/dashboard/consumables?tab=tires&error=tire");
  revalidatePath("/dashboard/consumables");
}

export async function updatePadSet(formData: FormData) {
  const { supabase, membership } = await authContext();
  const id = String(formData.get("id") ?? "");
  if (!membership || !id) redirect("/dashboard/consumables?tab=pads");
  const text = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const { error } = await supabase.from("pad_sets").update({
    vehicle_id: String(formData.get("vehicle_id") ?? ""),
    business_id: String(formData.get("business_id") ?? "").trim().toUpperCase(),
    axle: String(formData.get("axle") ?? "front"),
    manufacturer: String(formData.get("manufacturer") ?? "").trim(),
    model: String(formData.get("model") ?? "").trim(),
    compound: text("compound"),
    purchased_on: text("purchased_on"),
    starting_sessions: text("starting_sessions") ? Number(text("starting_sessions")) : null,
    status: String(formData.get("status") ?? "active"),
    notes: text("notes"),
  }).eq("workspace_id", membership.workspace_id).eq("id", id);
  if (error) redirect("/dashboard/consumables?tab=pads&error=pad");
  revalidatePath("/dashboard/consumables");
}

export async function createTrack(formData: FormData) {
  const { supabase, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const text = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const numeric = (name: string) => text(name) ? Number(text(name)) : null;
  const { data: track, error } = await supabase.from("tracks").insert({
    workspace_id: membership.workspace_id,
    name: String(formData.get("name") ?? "").trim(), short_name: text("short_name"),
    address: text("address"), city: text("city"), region: text("region"), postal_code: text("postal_code"), country: text("country") ?? "USA",
    latitude: numeric("latitude"), longitude: numeric("longitude"), timezone: text("timezone") ?? "America/Chicago", website_url: text("website_url"), notes: text("notes"),
  }).select("id").single();
  if (error || !track) redirect("/dashboard/tracks?error=track");
  const configuration = text("configuration_name");
  if (configuration) await supabase.from("track_configurations").insert({ workspace_id: membership.workspace_id, track_id: track.id, name: configuration });
  revalidatePath("/dashboard/tracks");
}

export async function updateTrack(formData: FormData) {
  const { supabase, membership } = await authContext();
  const trackId = String(formData.get("track_id") ?? "");
  if (!membership || !trackId) redirect("/dashboard/tracks");
  const text = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const numeric = (name: string) => text(name) ? Number(text(name)) : null;
  await supabase.from("tracks").update({
    name: String(formData.get("name") ?? "").trim(), short_name: text("short_name"),
    address: text("address"), city: text("city"), region: text("region"), postal_code: text("postal_code"), country: text("country") ?? "USA",
    latitude: numeric("latitude"), longitude: numeric("longitude"), timezone: text("timezone") ?? "America/Chicago", website_url: text("website_url"), notes: text("notes"), is_active: String(formData.get("is_active") ?? "true") === "true",
  }).eq("workspace_id", membership.workspace_id).eq("id", trackId);
  await supabase.from("events").update({ track_name: String(formData.get("name") ?? "").trim() }).eq("workspace_id", membership.workspace_id).eq("track_id", trackId);
  revalidatePath("/dashboard/tracks");
  revalidatePath(`/dashboard/tracks/${trackId}`);
}

export async function addTrackConfiguration(formData: FormData) {
  const { supabase, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const { error } = await supabase.from("track_configurations").insert({
    workspace_id: membership.workspace_id,
    track_id: String(formData.get("track_id") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    direction: String(formData.get("direction") ?? "").trim() || null,
    distance_miles: String(formData.get("distance_miles") ?? "").trim() ? Number(formData.get("distance_miles")) : null,
  });
  if (error) redirect(`/dashboard/tracks/${String(formData.get("track_id") ?? "")}?error=configuration`);
  revalidatePath("/dashboard/tracks");
  revalidatePath(`/dashboard/tracks/${String(formData.get("track_id") ?? "")}`);
}

export async function updateTrackConfiguration(formData: FormData) {
  const { supabase, membership } = await authContext();
  const trackId = String(formData.get("track_id") ?? "");
  const configurationId = String(formData.get("configuration_id") ?? "");
  if (!membership || !trackId || !configurationId) redirect("/dashboard/tracks");
  const name = String(formData.get("name") ?? "").trim();
  const { error } = await supabase.from("track_configurations").update({
    name,
    direction: String(formData.get("direction") ?? "").trim() || null,
    distance_miles: String(formData.get("distance_miles") ?? "").trim() ? Number(formData.get("distance_miles")) : null,
    is_active: String(formData.get("is_active") ?? "true") === "true",
  }).eq("workspace_id", membership.workspace_id).eq("track_id", trackId).eq("id", configurationId);
  if (error) redirect(`/dashboard/tracks/${trackId}?error=configuration`);
  await supabase.from("events").update({ configuration_name: name }).eq("workspace_id", membership.workspace_id).eq("configuration_id", configurationId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tracks");
  revalidatePath(`/dashboard/tracks/${trackId}`);
}

export async function createEvent(formData: FormData) {
  const { supabase, user, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const vehicleId = String(formData.get("vehicle_id") ?? "");
  const date = String(formData.get("event_date") ?? "");
  const trackId = String(formData.get("track_id") ?? "");
  const configurationId = String(formData.get("configuration_id") ?? "");
  const eventName = String(formData.get("event_name") ?? "").trim();
  const tireSetId = String(formData.get("tire_set_id") ?? "");
  const frontPadSetId = String(formData.get("front_pad_set_id") ?? "");
  const rearPadSetId = String(formData.get("rear_pad_set_id") ?? "");
  const { data: track } = await supabase.from("tracks").select("id,name,latitude,longitude").eq("workspace_id", membership.workspace_id).eq("id", trackId).single();
  const { data: configuration } = await supabase.from("track_configurations").select("id,name,track_id").eq("workspace_id", membership.workspace_id).eq("id", configurationId).eq("track_id", trackId).single();
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id, name")
    .eq("workspace_id", membership.workspace_id)
    .eq("id", vehicleId)
    .single();
  const noId = "00000000-0000-0000-0000-000000000000";
  const [{ data: tireSet }, { data: frontPadSet }, { data: rearPadSet }] = await Promise.all([
    supabase.from("tire_sets").select("id,business_id,vehicle_id").eq("workspace_id", membership.workspace_id).eq("id", tireSetId || noId).maybeSingle(),
    supabase.from("pad_sets").select("id,business_id,vehicle_id,axle").eq("workspace_id", membership.workspace_id).eq("id", frontPadSetId || noId).maybeSingle(),
    supabase.from("pad_sets").select("id,business_id,vehicle_id,axle").eq("workspace_id", membership.workspace_id).eq("id", rearPadSetId || noId).maybeSingle(),
  ]);
  const invalidConsumables =
    (tireSetId && (!tireSet || tireSet.vehicle_id !== vehicleId)) ||
    (frontPadSetId && (!frontPadSet || frontPadSet.vehicle_id !== vehicleId || frontPadSet.axle !== "front")) ||
    (rearPadSetId && (!rearPadSet || rearPadSet.vehicle_id !== vehicleId || rearPadSet.axle !== "rear"));
  if (!track || !configuration || !vehicle || !date || !eventName || invalidConsumables) {
    redirect("/dashboard/events/new?error=required");
  }

  const weather = track.latitude != null && track.longitude != null ? await getEventWeather(date, track.latitude, track.longitude) : null;
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
    configuration_name: configuration.name,
    track_id: track.id,
    configuration_id: configuration.id,
    organization_name: String(formData.get("organization_name") ?? "").trim() || null,
    event_type: String(formData.get("event_type") ?? "").trim() || null,
    team_name: String(formData.get("team_name") ?? "").trim() || "Ball Pit Motor",
    driver_name: String(formData.get("driver_name") ?? "").trim() || null,
    vehicle_id: vehicle.id,
    tire_set_id: tireSet?.id ?? null,
    front_pad_set_id: frontPadSet?.id ?? null,
    rear_pad_set_id: rearPadSet?.id ?? null,
    tire_set_business_id: tireSet?.business_id ?? null,
    front_pad_set_business_id: frontPadSet?.business_id ?? null,
    rear_pad_set_business_id: rearPadSet?.business_id ?? null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    created_by: user.id,
    ...(weather ?? {}),
  };
  const { data: event, error } = await supabase.from("events").insert(payload).select("id").single();
  if (error || !event) redirect("/dashboard/events/new?error=create");
  revalidatePath("/dashboard");
  redirect(`/dashboard/events/${event.id}`);
}

export async function updateEvent(formData: FormData) {
  const { supabase, membership } = await authContext();
  const eventId = String(formData.get("event_id") ?? "");
  if (!membership || !eventId) redirect("/dashboard");
  const vehicleId = String(formData.get("vehicle_id") ?? "");
  const date = String(formData.get("event_date") ?? "");
  const trackId = String(formData.get("track_id") ?? "");
  const configurationId = String(formData.get("configuration_id") ?? "");
  const eventName = String(formData.get("event_name") ?? "").trim();
  const tireSetId = String(formData.get("tire_set_id") ?? "");
  const frontPadSetId = String(formData.get("front_pad_set_id") ?? "");
  const rearPadSetId = String(formData.get("rear_pad_set_id") ?? "");
  const noId = "00000000-0000-0000-0000-000000000000";
  const [{ data: event }, { data: track }, { data: configuration }, { data: vehicle }, { data: tireSet }, { data: frontPadSet }, { data: rearPadSet }] = await Promise.all([
    supabase.from("events").select("id").eq("workspace_id", membership.workspace_id).eq("id", eventId).single(),
    supabase.from("tracks").select("id,name,latitude,longitude").eq("workspace_id", membership.workspace_id).eq("id", trackId).single(),
    supabase.from("track_configurations").select("id,name,track_id").eq("workspace_id", membership.workspace_id).eq("id", configurationId).eq("track_id", trackId).single(),
    supabase.from("vehicles").select("id,name").eq("workspace_id", membership.workspace_id).eq("id", vehicleId).single(),
    supabase.from("tire_sets").select("id,business_id,vehicle_id").eq("workspace_id", membership.workspace_id).eq("id", tireSetId || noId).maybeSingle(),
    supabase.from("pad_sets").select("id,business_id,vehicle_id,axle").eq("workspace_id", membership.workspace_id).eq("id", frontPadSetId || noId).maybeSingle(),
    supabase.from("pad_sets").select("id,business_id,vehicle_id,axle").eq("workspace_id", membership.workspace_id).eq("id", rearPadSetId || noId).maybeSingle(),
  ]);
  const invalidConsumables =
    (tireSetId && (!tireSet || tireSet.vehicle_id !== vehicleId)) ||
    (frontPadSetId && (!frontPadSet || frontPadSet.vehicle_id !== vehicleId || frontPadSet.axle !== "front")) ||
    (rearPadSetId && (!rearPadSet || rearPadSet.vehicle_id !== vehicleId || rearPadSet.axle !== "rear"));
  if (!event || !track || !configuration || !vehicle || !date || !eventName || invalidConsumables) {
    redirect(`/dashboard/events/${eventId}/edit?error=required`);
  }
  const weather = track.latitude != null && track.longitude != null ? await getEventWeather(date, track.latitude, track.longitude) : null;
  const { error } = await supabase.from("events").update({
    event_date: date,
    event_name: eventName,
    track_id: track.id,
    track_name: track.name,
    configuration_id: configuration.id,
    configuration_name: configuration.name,
    organization_name: String(formData.get("organization_name") ?? "").trim() || null,
    event_type: String(formData.get("event_type") ?? "").trim() || null,
    team_name: String(formData.get("team_name") ?? "").trim() || null,
    driver_name: String(formData.get("driver_name") ?? "").trim() || null,
    vehicle_id: vehicle.id,
    tire_set_id: tireSet?.id ?? null,
    front_pad_set_id: frontPadSet?.id ?? null,
    rear_pad_set_id: rearPadSet?.id ?? null,
    tire_set_business_id: tireSet?.business_id ?? null,
    front_pad_set_business_id: frontPadSet?.business_id ?? null,
    rear_pad_set_business_id: rearPadSet?.business_id ?? null,
    status: String(formData.get("status") ?? "planned"),
    ...(weather ?? {}),
  }).eq("workspace_id", membership.workspace_id).eq("id", eventId);
  if (error) redirect(`/dashboard/events/${eventId}/edit?error=save`);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/events/${eventId}`);
  redirect(`/dashboard/events/${eventId}`);
}

const EVENT_NOTE_CATEGORIES = ["General", "Plan", "Setup", "Driver Feedback", "Incident", "Follow-up"] as const;

export async function addEventNote(formData: FormData) {
  const { supabase, user, membership } = await authContext();
  const eventId = String(formData.get("event_id") ?? "");
  if (!membership || !eventId) redirect("/dashboard");
  const body = String(formData.get("body") ?? "").trim();
  const submittedCategory = String(formData.get("category") ?? "General");
  const category = EVENT_NOTE_CATEGORIES.includes(submittedCategory as (typeof EVENT_NOTE_CATEGORIES)[number]) ? submittedCategory : "General";
  if (!body || body.length > 5000) redirect(`/dashboard/events/${eventId}/notes/new?error=note`);
  const { data: event } = await supabase.from("events").select("id").eq("workspace_id", membership.workspace_id).eq("id", eventId).single();
  if (!event) redirect("/dashboard");
  const { error } = await supabase.from("event_notes").insert({
    workspace_id: membership.workspace_id,
    event_id: eventId,
    category,
    body,
    created_by: user.id,
  });
  if (error) redirect(`/dashboard/events/${eventId}/notes/new?error=note`);
  revalidatePath(`/dashboard/events/${eventId}`);
  redirect(`/dashboard/events/${eventId}?tab=notes`);
}

export async function updateEventNote(formData: FormData) {
  const { supabase, membership } = await authContext();
  const eventId = String(formData.get("event_id") ?? "");
  const noteId = String(formData.get("note_id") ?? "");
  if (!membership || !eventId || !noteId) redirect("/dashboard");
  const body = String(formData.get("body") ?? "").trim();
  const submittedCategory = String(formData.get("category") ?? "General");
  const category = EVENT_NOTE_CATEGORIES.includes(submittedCategory as (typeof EVENT_NOTE_CATEGORIES)[number]) ? submittedCategory : "General";
  if (!body || body.length > 5000) redirect(`/dashboard/events/${eventId}/notes/${noteId}/edit?error=note`);
  const { error } = await supabase.from("event_notes").update({ category, body, updated_at: new Date().toISOString() })
    .eq("workspace_id", membership.workspace_id).eq("event_id", eventId).eq("id", noteId);
  if (error) redirect(`/dashboard/events/${eventId}/notes/${noteId}/edit?error=note`);
  revalidatePath(`/dashboard/events/${eventId}`);
  redirect(`/dashboard/events/${eventId}?tab=notes`);
}

export async function deleteEventNote(formData: FormData) {
  const { supabase, membership } = await authContext();
  const eventId = String(formData.get("event_id") ?? "");
  const noteId = String(formData.get("note_id") ?? "");
  if (!membership || !eventId || !noteId) redirect("/dashboard");
  const { error } = await supabase.from("event_notes").delete()
    .eq("workspace_id", membership.workspace_id).eq("event_id", eventId).eq("id", noteId);
  if (error) redirect(`/dashboard/events/${eventId}/notes/${noteId}/edit?error=delete`);
  revalidatePath(`/dashboard/events/${eventId}`);
  redirect(`/dashboard/events/${eventId}?tab=notes`);
}

export async function addSession(formData: FormData) {
  const { supabase, user, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const eventId = String(formData.get("event_id") ?? "");
  const sessionNumber = Number(formData.get("session_number"));
  const bestLapInput = String(formData.get("best_lap") ?? "").trim();
  const bestLap = bestLapInput ? parseLap(bestLapInput) : null;
  if (!eventId || !sessionNumber || (bestLapInput && !bestLap)) redirect(`/dashboard/events/${eventId}/sessions/new?error=session`);
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
  if (error) redirect(`/dashboard/events/${eventId}/sessions/new?error=session`);
  revalidatePath(`/dashboard/events/${eventId}`);
  redirect(`/dashboard/events/${eventId}?tab=sessions`);
}

export async function updateSession(formData: FormData) {
  const { supabase, membership } = await authContext();
  const eventId = String(formData.get("event_id") ?? "");
  const sessionId = String(formData.get("session_id") ?? "");
  if (!membership || !eventId || !sessionId) redirect("/dashboard");
  const sessionNumber = Number(formData.get("session_number"));
  const bestLapInput = String(formData.get("best_lap") ?? "").trim();
  const bestLap = bestLapInput ? parseLap(bestLapInput) : null;
  if (!sessionNumber || (bestLapInput && !bestLap)) redirect(`/dashboard/events/${eventId}/sessions/${sessionId}/edit?error=session`);
  const { error } = await supabase.from("sessions").update({
    session_number: sessionNumber,
    started_at: String(formData.get("started_at") ?? "") || null,
    best_lap_ms: bestLap,
    source_url: String(formData.get("source_url") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  }).eq("workspace_id", membership.workspace_id).eq("event_id", eventId).eq("id", sessionId);
  if (error) redirect(`/dashboard/events/${eventId}/sessions/${sessionId}/edit?error=session`);
  revalidatePath(`/dashboard/events/${eventId}`);
  redirect(`/dashboard/events/${eventId}?tab=sessions`);
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

type ChecklistItemInput = { id: string; label: string; checked: boolean; note: string };

export async function saveChecklist(formData: FormData) {
  const { supabase, user, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const eventId = String(formData.get("event_id") ?? "");
  const runId = String(formData.get("run_id") ?? "");
  const intent = String(formData.get("intent") ?? "save");
  const makeTemplate = formData.get("make_template") === "true";
  let submitted: unknown;
  try { submitted = JSON.parse(String(formData.get("items_json") ?? "[]")); } catch { submitted = []; }
  const items = (Array.isArray(submitted) ? submitted : []).slice(0, 75).map((item, position) => {
    const value = item as Partial<ChecklistItemInput>;
    return {
      id: String(value.id ?? crypto.randomUUID()),
      label: String(value.label ?? "").trim().slice(0, 240),
      checked: value.checked === true,
      note: String(value.note ?? "").trim().slice(0, 2000),
      position,
      is_required: true,
    };
  }).filter((item) => item.label);
  if (!eventId || !runId || !items.length) redirect(`/dashboard/events/${eventId}?error=checklist`);
  const { data: run } = await supabase
    .from("checklist_runs")
    .select("id,template_id,template_version")
    .eq("workspace_id", membership.workspace_id)
    .eq("event_id", eventId)
    .eq("id", runId)
    .single();
  if (!run) redirect(`/dashboard/events/${eventId}?error=checklist`);

  let snapshot = items.map(({ id, label, position, is_required }) => ({ id, label, position, is_required }));
  let templateId = run.template_id;
  let templateVersion = run.template_version;
  const originalItemIds = items.map((item) => item.id);
  if (makeTemplate) {
    const { data: latest } = await supabase.from("checklist_templates").select("version").eq("workspace_id", membership.workspace_id).order("version", { ascending: false }).limit(1).maybeSingle();
    templateVersion = (latest?.version ?? 0) + 1;
    const { data: template, error: templateError } = await supabase.from("checklist_templates").insert({
      workspace_id: membership.workspace_id,
      name: "Standard Pre-Event Checklist",
      version: templateVersion,
      is_active: false,
    }).select("id").single();
    if (templateError || !template) redirect(`/dashboard/events/${eventId}?error=template`);
    templateId = template.id;
    const { data: templateItems, error: itemError } = await supabase.from("checklist_template_items").insert(items.map((item) => ({
      workspace_id: membership.workspace_id,
      template_id: template.id,
      position: item.position,
      label: item.label,
      is_required: true,
    }))).select("id,label,position,is_required");
    if (itemError || !templateItems) redirect(`/dashboard/events/${eventId}?error=template`);
    await supabase.from("checklist_templates").update({ is_active: false }).eq("workspace_id", membership.workspace_id).eq("is_active", true);
    const { error: activateError } = await supabase.from("checklist_templates").update({ is_active: true }).eq("workspace_id", membership.workspace_id).eq("id", template.id);
    if (activateError) redirect(`/dashboard/events/${eventId}?error=template`);
    snapshot = templateItems;
    await Promise.all(originalItemIds.map((itemId, position) => supabase.from("checklist_item_attachments").update({ checklist_item_key: snapshot[position]?.id }).eq("workspace_id", membership.workspace_id).eq("checklist_run_id", runId).eq("checklist_item_key", itemId)));
  }

  await supabase.from("checklist_item_results").delete().eq("checklist_run_id", runId);
  const { error: resultError } = await supabase.from("checklist_item_results").insert(
    items.map((item, position) => ({
      workspace_id: membership.workspace_id,
      checklist_run_id: runId,
      template_item_id: makeTemplate ? snapshot[position]?.id ?? null : null,
      response: { item_id: snapshot[position]?.id ?? item.id, checked: item.checked },
      note: item.note || null,
      completed_by: user.id,
      completed_at: new Date().toISOString(),
    })),
  );
  if (resultError) redirect(`/dashboard/events/${eventId}?error=checklist`);
  const { error: runError } = await supabase.from("checklist_runs").update({
    template_id: templateId,
    template_version: templateVersion,
    template_snapshot: snapshot,
    status: intent === "complete" ? "complete" : "open",
  }).eq("workspace_id", membership.workspace_id).eq("id", runId);
  if (runError) redirect(`/dashboard/events/${eventId}?error=checklist`);
  revalidatePath(`/dashboard/events/${eventId}`);
}
