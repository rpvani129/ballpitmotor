"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { eventBusinessId, parseLap } from "@/lib/grid";
import { getEventWeather } from "@/lib/weather";
import { provisionWorkspace } from "@/lib/provision-workspace";

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

export async function saveUserProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const firstName = String(formData.get("first_name") ?? "").trim().slice(0, 80);
  const lastName = String(formData.get("last_name") ?? "").trim().slice(0, 80);
  const driverName = (String(formData.get("driver_name") ?? "").trim() || `${firstName}-${lastName}`).slice(0, 120);
  if (!firstName || !lastName || !driverName) redirect("/new-user?error=required");
  const profile = { user_id: user.id, first_name: firstName, last_name: lastName, driver_name: driverName, driver_number: String(formData.get("driver_number") ?? "").trim().slice(0, 20) || null, team_name: String(formData.get("team_name") ?? "").trim().slice(0, 120) || null, onboarding_complete: true };
  const { error } = await supabase.from("user_profiles").upsert(profile, { onConflict: "user_id" });
  if (error) redirect(`${formData.get("profile_mode") === "edit" ? "/dashboard/profile/edit" : "/new-user"}?error=profile`);
  await supabase.auth.updateUser({ data: { first_name: firstName, last_name: lastName, driver_name: driverName, driver_number: profile.driver_number, team_name: profile.team_name } });
  await supabase.from("people").update({ display_name: driverName }).eq("linked_user_id", user.id);
  revalidatePath("/dashboard");
  if (formData.get("profile_mode") === "edit") redirect("/dashboard/profile?saved=profile");
  redirect("/dashboard");
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("password_confirmation") ?? "");
  if (password.length < 8 || password !== confirmation) redirect("/dashboard/profile?error=password");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/dashboard/profile?error=password_update");
  redirect("/dashboard/profile?saved=password");
}

export async function deleteVehicle(formData: FormData) {
  const { supabase, membership } = await authContext();
  const vehicleId = String(formData.get("vehicle_id") ?? "");
  if (!membership || !vehicleId) redirect("/dashboard/vehicles");
  const { count } = await supabase.from("events").select("id", { count: "exact", head: true }).eq("workspace_id", membership.workspace_id).eq("vehicle_id", vehicleId);
  if (count) redirect("/dashboard/vehicles?error=vehicle_in_use");
  const { data, error } = await supabase.from("vehicles").delete().eq("workspace_id", membership.workspace_id).eq("id", vehicleId).select("id").maybeSingle();
  if (error || !data) redirect("/dashboard/vehicles?error=delete");
  revalidatePath("/dashboard/vehicles");
  redirect("/dashboard/vehicles?deleted=vehicle");
}

export async function createBallPitWorkspace() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  try { await provisionWorkspace(supabase, user); }
  catch { redirect("/dashboard?error=workspace"); }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function createVehicle(formData: FormData) {
  const { supabase, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const name = String(formData.get("name") ?? "").trim();
  const businessId = String(formData.get("business_id") ?? "").trim().toUpperCase();
  if (!name || !businessId) redirect("/dashboard/vehicles?error=required");
  const text = (field: string) => String(formData.get(field) ?? "").trim() || null;
  const numeric = (field: string) => text(field) ? Number(text(field)) : null;
  const { error } = await supabase.from("vehicles").insert({
    workspace_id: membership.workspace_id,
    name,
    business_id: businessId,
    status: String(formData.get("status") ?? "active"), year: numeric("year"), make: text("make"), model: text("model"), trim: text("trim"),
    race_number: text("race_number"), competition_class: text("competition_class"), description: text("description"), wiki_url: text("wiki_url"), image_url: text("image_url"),
    current_odometer_miles: numeric("current_odometer_miles"), acquired_on: text("acquired_on"),
  });
  if (error) redirect("/dashboard/vehicles/new?error=save");
  revalidatePath("/dashboard/vehicles");
  redirect("/dashboard/vehicles");
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
  if (error) redirect(`/dashboard/vehicles/${vehicleId}/edit?error=vehicle`);
  revalidatePath(`/dashboard/vehicles/${vehicleId}`);
  revalidatePath("/dashboard/vehicles");
  redirect("/dashboard/vehicles");
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

export async function deleteMaintenanceRecord(formData: FormData) {
  const { supabase, membership } = await authContext();
  const id = String(formData.get("maintenance_record_id") ?? "");
  const vehicleId = String(formData.get("vehicle_id") ?? "");
  if (!membership || !id || !vehicleId) redirect("/dashboard/vehicles");
  const { data, error } = await supabase.from("maintenance_records").delete().eq("workspace_id", membership.workspace_id).eq("vehicle_id", vehicleId).eq("id", id).select("id").maybeSingle();
  if (error || !data) redirect(`/dashboard/vehicles/${vehicleId}?error=delete-service`);
  revalidatePath(`/dashboard/vehicles/${vehicleId}`);
  redirect(`/dashboard/vehicles/${vehicleId}?deleted=service`);
}

export async function addMaintenanceRecordItem(formData: FormData) {
  const { supabase, membership } = await authContext();
  const maintenanceRecordId = String(formData.get("maintenance_record_id") ?? "");
  const vehicleId = String(formData.get("vehicle_id") ?? "");
  if (!membership || !maintenanceRecordId || !vehicleId) redirect("/dashboard/vehicles");
  const text = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const { data: record } = await supabase.from("maintenance_records").select("id")
    .eq("workspace_id", membership.workspace_id).eq("vehicle_id", vehicleId).eq("id", maintenanceRecordId).single();
  if (!record) redirect(`/dashboard/vehicles/${vehicleId}/service/${maintenanceRecordId}/items/new?error=record`);
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
  if (error) redirect(`/dashboard/vehicles/${vehicleId}/service/${maintenanceRecordId}/items/new?error=save`);
  revalidatePath(`/dashboard/vehicles/${vehicleId}`);
  redirect(`/dashboard/vehicles/${vehicleId}`);
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
  if (!record) redirect(`/dashboard/vehicles/${vehicleId}/service/${maintenanceRecordId}/items/${id}/edit?error=record`);
  const { error } = await supabase.from("maintenance_record_items").update({
    category: String(formData.get("category") ?? "Maintenance").trim(),
    title: String(formData.get("title") ?? "").trim(),
    details: text("details"),
    quantity: text("quantity"),
    line_amount: text("line_amount") ? Number(text("line_amount")) : null,
    source_item_number: text("source_item_number"),
    status: String(formData.get("status") ?? "Complete").trim(),
  }).eq("workspace_id", membership.workspace_id).eq("maintenance_record_id", maintenanceRecordId).eq("id", id);
  if (error) redirect(`/dashboard/vehicles/${vehicleId}/service/${maintenanceRecordId}/items/${id}/edit?error=save`);
  revalidatePath(`/dashboard/vehicles/${vehicleId}`);
  redirect(`/dashboard/vehicles/${vehicleId}`);
}

export async function deleteMaintenanceRecordItem(formData: FormData) {
  const { supabase, membership } = await authContext();
  const id = String(formData.get("item_id") ?? "");
  const maintenanceRecordId = String(formData.get("maintenance_record_id") ?? "");
  const vehicleId = String(formData.get("vehicle_id") ?? "");
  if (!membership || !id || !maintenanceRecordId || !vehicleId) redirect("/dashboard/vehicles");
  const { data, error } = await supabase.from("maintenance_record_items").delete().eq("workspace_id", membership.workspace_id).eq("maintenance_record_id", maintenanceRecordId).eq("id", id).select("id").maybeSingle();
  if (error || !data) redirect(`/dashboard/vehicles/${vehicleId}?error=delete-service-item`);
  revalidatePath(`/dashboard/vehicles/${vehicleId}`);
  redirect(`/dashboard/vehicles/${vehicleId}?deleted=service-item`);
}

export async function commitServiceRecordImport(formData: FormData) {
  const { supabase, membership } = await authContext();
  const importId = String(formData.get("import_id") ?? "");
  const vehicleId = String(formData.get("vehicle_id") ?? "");
  if (!membership || !importId || !vehicleId) redirect("/dashboard/vehicles");
  type DraftRecord = { service_date?: string; category?: string; title?: string; description?: string | null; odometer_miles?: number | null; vendor?: string | null; cost?: number | null; invoice_number?: string | null; items?: { category?: string; title?: string; details?: string | null; quantity?: string | null; line_amount?: number | null; source_item_number?: string | null; status?: string }[] };
  let draft: { records?: DraftRecord[] };
  try { draft = JSON.parse(String(formData.get("draft") ?? "{}")); } catch { redirect(`/dashboard/vehicles/${vehicleId}/service/imports/${importId}?error=draft`); }
  const { data: imported } = await supabase.from("service_record_imports").select("*").eq("workspace_id", membership.workspace_id).eq("vehicle_id", vehicleId).eq("id", importId).single();
  if (!imported || imported.status !== "review" || imported.committed_record_id) redirect(`/dashboard/vehicles/${vehicleId}/service/imports/${importId}?error=state`);
  const finite = (value: unknown) => value !== null && value !== "" && Number.isFinite(Number(value)) ? Number(value) : null;
  const records = (Array.isArray(draft.records) ? draft.records : []).slice(0, 20).map((record) => {
    const serviceDate = String(record.service_date ?? "").trim(); const title = String(record.title ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate) || !title) return null;
    const items = (Array.isArray(record.items) ? record.items : []).slice(0, 100).filter((item) => String(item.title ?? "").trim()).map((item, position) => ({ position, category: String(item.category ?? "Maintenance").slice(0, 80), title: String(item.title ?? "").trim().slice(0, 200), details: String(item.details ?? "").trim().slice(0, 10000) || null, quantity: String(item.quantity ?? "").trim().slice(0, 80) || null, line_amount: finite(item.line_amount), source_item_number: String(item.source_item_number ?? "").trim().slice(0, 80) || null, status: String(item.status ?? "Complete").slice(0, 80) }));
    return { service_date: serviceDate, category: String(record.category ?? "Maintenance").slice(0, 80), title: title.slice(0, 200), description: String(record.description ?? "").trim().slice(0, 10000) || null, odometer_miles: finite(record.odometer_miles), vendor: String(record.vendor ?? "").trim().slice(0, 200) || null, cost: finite(record.cost), invoice_number: String(record.invoice_number ?? "").trim().slice(0, 100) || null, items };
  });
  if (!records.length || records.some((record) => record === null)) redirect(`/dashboard/vehicles/${vehicleId}/service/imports/${importId}?error=required`);
  const { error: commitError } = await supabase.rpc("commit_service_record_import_batch", { p_import_id: importId, p_vehicle_id: vehicleId, p_records: records });
  if (commitError) redirect(`/dashboard/vehicles/${vehicleId}/service/imports/${importId}?error=commit`);
  revalidatePath(`/dashboard/vehicles/${vehicleId}`);
  redirect(`/dashboard/vehicles/${vehicleId}?imported=service`);
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
    is_current: formData.get("is_current") === "on",
    notes: text("notes"),
  });
  if (error) redirect("/dashboard/consumables/tires/new?error=save");
  revalidatePath("/dashboard/consumables");
  redirect("/dashboard/consumables?tab=tires");
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
    is_current: formData.get("is_current") === "on",
    notes: text("notes"),
  });
  if (error) redirect("/dashboard/consumables/pads/new?error=save");
  revalidatePath("/dashboard/consumables");
  redirect("/dashboard/consumables?tab=pads");
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
    is_current: formData.get("is_current") === "on" && String(formData.get("status") ?? "active") === "active",
    notes: text("notes"),
  }).eq("workspace_id", membership.workspace_id).eq("id", id);
  if (error) redirect(`/dashboard/consumables/tires/${id}/edit?error=save`);
  revalidatePath("/dashboard/consumables");
  redirect("/dashboard/consumables?tab=tires");
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
    is_current: formData.get("is_current") === "on" && String(formData.get("status") ?? "active") === "active",
    notes: text("notes"),
  }).eq("workspace_id", membership.workspace_id).eq("id", id);
  if (error) redirect(`/dashboard/consumables/pads/${id}/edit?error=save`);
  revalidatePath("/dashboard/consumables");
  redirect("/dashboard/consumables?tab=pads");
}

export async function deleteConsumable(formData: FormData) {
  const { supabase, membership } = await authContext();
  const id = String(formData.get("asset_id") ?? "");
  const kind = String(formData.get("kind") ?? "");
  if (!membership || !id || (kind !== "tires" && kind !== "pads")) redirect("/dashboard/consumables");
  const references = kind === "tires"
    ? await supabase.from("events").select("id", { count: "exact", head: true }).eq("workspace_id", membership.workspace_id).eq("tire_set_id", id)
    : await supabase.from("events").select("id", { count: "exact", head: true }).eq("workspace_id", membership.workspace_id).or(`front_pad_set_id.eq.${id},rear_pad_set_id.eq.${id}`);
  if (references.count) redirect(`/dashboard/consumables?tab=${kind}&error=asset_in_use`);
  const table = kind === "tires" ? "tire_sets" : "pad_sets";
  const { data, error } = await supabase.from(table).delete().eq("workspace_id", membership.workspace_id).eq("id", id).select("id").maybeSingle();
  if (error || !data) redirect(`/dashboard/consumables?tab=${kind}&error=delete`);
  revalidatePath("/dashboard/consumables");
  redirect(`/dashboard/consumables?tab=${kind}&deleted=asset`);
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
  if (error || !track) redirect("/dashboard/tracks/new?error=track");
  const configuration = text("configuration_name");
  if (configuration) await supabase.from("track_configurations").insert({ workspace_id: membership.workspace_id, track_id: track.id, name: configuration });
  revalidatePath("/dashboard/tracks");
  redirect("/dashboard/tracks");
}

export async function updateTrack(formData: FormData) {
  const { supabase, membership } = await authContext();
  const trackId = String(formData.get("track_id") ?? "");
  if (!membership || !trackId) redirect("/dashboard/tracks");
  const text = (name: string) => String(formData.get(name) ?? "").trim() || null;
  const numeric = (name: string) => text(name) ? Number(text(name)) : null;
  const { error } = await supabase.from("tracks").update({
    name: String(formData.get("name") ?? "").trim(), short_name: text("short_name"),
    address: text("address"), city: text("city"), region: text("region"), postal_code: text("postal_code"), country: text("country") ?? "USA",
    latitude: numeric("latitude"), longitude: numeric("longitude"), timezone: text("timezone") ?? "America/Chicago", website_url: text("website_url"), notes: text("notes"), is_active: String(formData.get("is_active") ?? "true") === "true",
  }).eq("workspace_id", membership.workspace_id).eq("id", trackId);
  if (error) redirect(`/dashboard/tracks/${trackId}/edit?error=track`);
  await supabase.from("events").update({ track_name: String(formData.get("name") ?? "").trim() }).eq("workspace_id", membership.workspace_id).eq("track_id", trackId);
  revalidatePath("/dashboard/tracks");
  revalidatePath(`/dashboard/tracks/${trackId}`);
  redirect("/dashboard/tracks");
}

export async function deleteTrack(formData: FormData) {
  const { supabase, membership } = await authContext();
  const trackId = String(formData.get("track_id") ?? "");
  if (!membership || !trackId) redirect("/dashboard/tracks");
  const { count } = await supabase.from("events").select("id", { count: "exact", head: true }).eq("workspace_id", membership.workspace_id).eq("track_id", trackId);
  if (count) redirect("/dashboard/tracks?error=track_in_use");
  const { data, error } = await supabase.from("tracks").delete().eq("workspace_id", membership.workspace_id).eq("id", trackId).select("id").maybeSingle();
  if (error || !data) redirect("/dashboard/tracks?error=delete");
  revalidatePath("/dashboard/tracks");
  redirect("/dashboard/tracks?deleted=track");
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
  if (error) redirect(`/dashboard/tracks/${String(formData.get("track_id") ?? "")}/configurations/new?error=configuration`);
  revalidatePath("/dashboard/tracks");
  revalidatePath(`/dashboard/tracks/${String(formData.get("track_id") ?? "")}`);
  redirect(`/dashboard/tracks/${String(formData.get("track_id") ?? "")}`);
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
  if (error) redirect(`/dashboard/tracks/${trackId}/configurations/${configurationId}/edit?error=configuration`);
  await supabase.from("events").update({ configuration_name: name }).eq("workspace_id", membership.workspace_id).eq("configuration_id", configurationId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tracks");
  revalidatePath(`/dashboard/tracks/${trackId}`);
  redirect(`/dashboard/tracks/${trackId}`);
}

export async function deleteTrackConfiguration(formData: FormData) {
  const { supabase, membership } = await authContext();
  const trackId = String(formData.get("track_id") ?? "");
  const configurationId = String(formData.get("configuration_id") ?? "");
  if (!membership || !trackId || !configurationId) redirect("/dashboard/tracks");
  const { count } = await supabase.from("events").select("id", { count: "exact", head: true }).eq("workspace_id", membership.workspace_id).eq("configuration_id", configurationId);
  if (count) redirect(`/dashboard/tracks/${trackId}?error=configuration_in_use`);
  const { data, error } = await supabase.from("track_configurations").delete().eq("workspace_id", membership.workspace_id).eq("track_id", trackId).eq("id", configurationId).select("id").maybeSingle();
  if (error || !data) redirect(`/dashboard/tracks/${trackId}?error=delete`);
  revalidatePath(`/dashboard/tracks/${trackId}`);
  redirect(`/dashboard/tracks/${trackId}?deleted=configuration`);
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
  const eventTypeId = String(formData.get("event_type_id") ?? "");
  const teamId = String(formData.get("team_id") ?? "");
  const { data: track } = await supabase.from("tracks").select("id,name,latitude,longitude").eq("workspace_id", membership.workspace_id).eq("id", trackId).single();
  const { data: configuration } = await supabase.from("track_configurations").select("id,name,track_id").eq("workspace_id", membership.workspace_id).eq("id", configurationId).eq("track_id", trackId).single();
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id, name")
    .eq("workspace_id", membership.workspace_id)
    .eq("id", vehicleId)
    .single();
  const noId = "00000000-0000-0000-0000-000000000000";
  const [{ data: tireSet }, { data: frontPadSet }, { data: rearPadSet }, { data: eventType }, { data: team }] = await Promise.all([
    supabase.from("tire_sets").select("id,business_id,vehicle_id").eq("workspace_id", membership.workspace_id).eq("id", tireSetId || noId).maybeSingle(),
    supabase.from("pad_sets").select("id,business_id,vehicle_id,axle").eq("workspace_id", membership.workspace_id).eq("id", frontPadSetId || noId).maybeSingle(),
    supabase.from("pad_sets").select("id,business_id,vehicle_id,axle").eq("workspace_id", membership.workspace_id).eq("id", rearPadSetId || noId).maybeSingle(),
    supabase.from("event_types").select("id,name").eq("workspace_id", membership.workspace_id).eq("id", eventTypeId || noId).maybeSingle(),
    supabase.from("teams").select("id,name").eq("workspace_id", membership.workspace_id).eq("id", teamId || noId).maybeSingle(),
  ]);
  const invalidConsumables =
    (tireSetId && (!tireSet || tireSet.vehicle_id !== vehicleId)) ||
    (frontPadSetId && (!frontPadSet || frontPadSet.vehicle_id !== vehicleId || frontPadSet.axle !== "front")) ||
    (rearPadSetId && (!rearPadSet || rearPadSet.vehicle_id !== vehicleId || rearPadSet.axle !== "rear")) ||
    (eventTypeId && !eventType) ||
    (teamId && !team);
  if (!date || !eventName || !vehicleId || !trackId || !configurationId) {
    redirect("/dashboard/events/new?error=required");
  }
  if (!track || !configuration || !vehicle || invalidConsumables) redirect("/dashboard/events/new?error=selection");

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
    event_type_id: eventType?.id ?? null,
    event_type: eventType?.name ?? null,
    team_id: team?.id ?? null,
    team_name: team?.name ?? null,
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
  const eventTypeId = String(formData.get("event_type_id") ?? "");
  const teamId = String(formData.get("team_id") ?? "");
  const noId = "00000000-0000-0000-0000-000000000000";
  const [{ data: event }, { data: track }, { data: configuration }, { data: vehicle }, { data: tireSet }, { data: frontPadSet }, { data: rearPadSet }, { data: eventType }, { data: team }] = await Promise.all([
    supabase.from("events").select("id").eq("workspace_id", membership.workspace_id).eq("id", eventId).single(),
    supabase.from("tracks").select("id,name,latitude,longitude").eq("workspace_id", membership.workspace_id).eq("id", trackId).single(),
    supabase.from("track_configurations").select("id,name,track_id").eq("workspace_id", membership.workspace_id).eq("id", configurationId).eq("track_id", trackId).single(),
    supabase.from("vehicles").select("id,name").eq("workspace_id", membership.workspace_id).eq("id", vehicleId).single(),
    supabase.from("tire_sets").select("id,business_id,vehicle_id").eq("workspace_id", membership.workspace_id).eq("id", tireSetId || noId).maybeSingle(),
    supabase.from("pad_sets").select("id,business_id,vehicle_id,axle").eq("workspace_id", membership.workspace_id).eq("id", frontPadSetId || noId).maybeSingle(),
    supabase.from("pad_sets").select("id,business_id,vehicle_id,axle").eq("workspace_id", membership.workspace_id).eq("id", rearPadSetId || noId).maybeSingle(),
    supabase.from("event_types").select("id,name").eq("workspace_id", membership.workspace_id).eq("id", eventTypeId || noId).maybeSingle(),
    supabase.from("teams").select("id,name").eq("workspace_id", membership.workspace_id).eq("id", teamId || noId).maybeSingle(),
  ]);
  const invalidConsumables =
    (tireSetId && (!tireSet || tireSet.vehicle_id !== vehicleId)) ||
    (frontPadSetId && (!frontPadSet || frontPadSet.vehicle_id !== vehicleId || frontPadSet.axle !== "front")) ||
    (rearPadSetId && (!rearPadSet || rearPadSet.vehicle_id !== vehicleId || rearPadSet.axle !== "rear")) ||
    (eventTypeId && !eventType) ||
    (teamId && !team);
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
    event_type_id: eventType?.id ?? null,
    event_type: eventType?.name ?? null,
    team_id: team?.id ?? null,
    team_name: team?.name ?? null,
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

export async function deleteEvent(formData: FormData) {
  const { supabase, membership } = await authContext();
  const eventId = String(formData.get("event_id") ?? "");
  if (!membership || !eventId) redirect("/dashboard");
  const [{ data: eventFiles }, { data: checklistFiles }] = await Promise.all([
    supabase.from("event_attachments").select("storage_path").eq("workspace_id", membership.workspace_id).eq("event_id", eventId),
    supabase.from("checklist_item_attachments").select("storage_path").eq("workspace_id", membership.workspace_id).eq("event_id", eventId),
  ]);
  const { data, error } = await supabase.from("events").delete().eq("workspace_id", membership.workspace_id).eq("id", eventId).select("id").maybeSingle();
  if (error || !data) redirect(`/dashboard/events/${eventId}?error=delete`);
  const paths = [...(eventFiles ?? []), ...(checklistFiles ?? [])].map((file) => file.storage_path);
  if (paths.length) await supabase.storage.from("event-attachments").remove(paths);
  revalidatePath("/dashboard");
  redirect("/dashboard?deleted=event");
}

export async function addEventNote(formData: FormData) {
  const { supabase, user, membership } = await authContext();
  const eventId = String(formData.get("event_id") ?? "");
  if (!membership || !eventId) redirect("/dashboard");
  const body = String(formData.get("body") ?? "").trim();
  const submittedCategory = String(formData.get("category") ?? "General");
  const { data: validCategory } = await supabase.from("event_note_categories").select("name").eq("workspace_id", membership.workspace_id).eq("name", submittedCategory).maybeSingle();
  const category = validCategory?.name ?? "General";
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
  const { data: validCategory } = await supabase.from("event_note_categories").select("name").eq("workspace_id", membership.workspace_id).eq("name", submittedCategory).maybeSingle();
  const category = validCategory?.name ?? "General";
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

export async function updateEventSettings(formData: FormData) {
  const { supabase, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const { error } = await supabase.from("event_settings").upsert({
    workspace_id: membership.workspace_id,
    show_public_events: formData.get("show_public_events") === "true",
    updated_at: new Date().toISOString(),
  }, { onConflict: "workspace_id" });
  if (error) redirect("/dashboard/settings/events?error=settings");
  revalidatePath("/dashboard");
  redirect("/dashboard/settings/events?saved=settings");
}

export async function updateFirstTimeSettings(formData: FormData) {
  const { supabase, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const { error } = await supabase.from("event_settings").upsert({
    workspace_id: membership.workspace_id,
    show_first_time_popup: formData.get("show_first_time_popup") === "true",
    updated_at: new Date().toISOString(),
  }, { onConflict: "workspace_id" });
  if (error) redirect("/dashboard/settings/events?error=settings");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings/events");
}

export async function addEventNoteCategory(formData: FormData) {
  const { supabase, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  if (!name) redirect("/dashboard/settings/events?error=category");
  const { error } = await supabase.from("event_note_categories").insert({ workspace_id: membership.workspace_id, name });
  if (error) redirect("/dashboard/settings/events?error=category");
  revalidatePath("/dashboard/settings/events");
  redirect("/dashboard/settings/events?saved=category");
}

export async function deleteEventNoteCategory(formData: FormData) {
  const { supabase, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const name = String(formData.get("name") ?? "");
  const { count } = await supabase.from("event_notes").select("id", { count: "exact", head: true }).eq("workspace_id", membership.workspace_id).eq("category", name);
  if ((count ?? 0) > 0) redirect("/dashboard/settings/events?error=category_in_use");
  const { error } = await supabase.from("event_note_categories").delete().eq("workspace_id", membership.workspace_id).eq("name", name);
  if (error) redirect("/dashboard/settings/events?error=category");
  revalidatePath("/dashboard/settings/events");
  redirect("/dashboard/settings/events?saved=deleted");
}

export async function addEventType(formData: FormData) {
  const { supabase, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!name) redirect("/dashboard/settings/events?error=event_type");
  const { error } = await supabase.from("event_types").insert({ workspace_id: membership.workspace_id, name });
  if (error) redirect("/dashboard/settings/events?error=event_type");
  revalidatePath("/dashboard/settings/events");
  redirect("/dashboard/settings/events?saved=event_type");
}

export async function deleteEventType(formData: FormData) {
  const { supabase, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const id = String(formData.get("id") ?? "");
  const { count } = await supabase.from("events").select("id", { count: "exact", head: true }).eq("workspace_id", membership.workspace_id).eq("event_type_id", id);
  if ((count ?? 0) > 0) redirect("/dashboard/settings/events?error=event_type_in_use");
  const { error } = await supabase.from("event_types").delete().eq("workspace_id", membership.workspace_id).eq("id", id);
  if (error) redirect("/dashboard/settings/events?error=event_type");
  revalidatePath("/dashboard/settings/events");
  redirect("/dashboard/settings/events?saved=deleted");
}

export async function addTeam(formData: FormData) {
  const { supabase, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  if (!name) redirect("/dashboard/settings/events?error=team");
  const { error } = await supabase.from("teams").insert({ workspace_id: membership.workspace_id, name });
  if (error) redirect("/dashboard/settings/events?error=team");
  revalidatePath("/dashboard/settings/events");
  redirect("/dashboard/settings/events?saved=team");
}

export async function deleteTeam(formData: FormData) {
  const { supabase, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const id = String(formData.get("id") ?? "");
  const { count } = await supabase.from("events").select("id", { count: "exact", head: true }).eq("workspace_id", membership.workspace_id).eq("team_id", id);
  if ((count ?? 0) > 0) redirect("/dashboard/settings/events?error=team_in_use");
  const { error } = await supabase.from("teams").delete().eq("workspace_id", membership.workspace_id).eq("id", id);
  if (error) redirect("/dashboard/settings/events?error=team");
  revalidatePath("/dashboard/settings/events");
  redirect("/dashboard/settings/events?saved=deleted");
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

export async function deleteSession(formData: FormData) {
  const { supabase, membership } = await authContext();
  const eventId = String(formData.get("event_id") ?? "");
  const sessionId = String(formData.get("session_id") ?? "");
  if (!membership || !eventId || !sessionId) redirect("/dashboard");
  const { data, error } = await supabase.from("sessions").delete().eq("workspace_id", membership.workspace_id).eq("event_id", eventId).eq("id", sessionId).select("id").maybeSingle();
  if (error || !data) redirect(`/dashboard/events/${eventId}?tab=sessions&error=delete-session`);
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/dashboard");
  redirect(`/dashboard/events/${eventId}?tab=sessions&deleted=session`);
}

export async function commitGarminSessionImport(formData: FormData) {
  const { supabase, membership } = await authContext();
  const eventId = String(formData.get("event_id") ?? ""); const importId = String(formData.get("import_id") ?? "");
  if (!membership || !eventId || !importId) redirect("/dashboard");
  let draft: { sessions?: { session_number?: number; started_at?: string | null; best_lap?: string | null; source_file_name?: string; source_storage_path?: string; notes?: string | null }[] };
  try { draft = JSON.parse(String(formData.get("draft") ?? "{}")); } catch { redirect(`/dashboard/events/${eventId}/sessions/import/${importId}?error=draft`); }
  const { data: imported } = await supabase.from("session_imports").select("id,status").eq("workspace_id", membership.workspace_id).eq("event_id", eventId).eq("id", importId).single();
  if (!imported || imported.status !== "review") redirect(`/dashboard/events/${eventId}/sessions/import/${importId}?error=state`);
  const sessions = (Array.isArray(draft.sessions) ? draft.sessions : []).slice(0, 50).map((session) => {
    const sessionNumber = Number(session.session_number); const startedAt = String(session.started_at ?? "").trim(); const lapInput = String(session.best_lap ?? "").trim(); const bestLap = lapInput ? parseLap(lapInput) : null;
    if (!Number.isInteger(sessionNumber) || sessionNumber < 1 || (startedAt && !/^([01]\d|2[0-3]):[0-5]\d$/.test(startedAt)) || (lapInput && !bestLap)) return null;
    return { session_number: sessionNumber, started_at: startedAt || null, best_lap_ms: bestLap, source_file_name: String(session.source_file_name ?? "").slice(0, 255) || null, source_storage_path: String(session.source_storage_path ?? "").slice(0, 1000) || null, notes: String(session.notes ?? "").trim().slice(0, 5000) || null };
  });
  const numbers = sessions.filter(Boolean).map((session) => session!.session_number);
  if (!sessions.length || sessions.some((session) => session === null) || new Set(numbers).size !== numbers.length) redirect(`/dashboard/events/${eventId}/sessions/import/${importId}?error=required`);
  const { error } = await supabase.rpc("commit_session_import", { p_import_id: importId, p_event_id: eventId, p_sessions: sessions });
  if (error) redirect(`/dashboard/events/${eventId}/sessions/import/${importId}?error=commit`);
  revalidatePath(`/dashboard/events/${eventId}`); revalidatePath("/dashboard"); revalidatePath("/dashboard/reports");
  redirect(`/dashboard/events/${eventId}?tab=sessions&imported=garmin`);
}

export async function startChecklist(formData: FormData) {
  const { supabase, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const eventId = String(formData.get("event_id") ?? "");
  const vehicleId = String(formData.get("vehicle_id") ?? "") || null;
  const templateId = String(formData.get("template_id") ?? "");
  const { data: template } = await supabase
    .from("checklist_templates")
    .select("id, version, checklist_template_items(id, label, position, is_required)")
    .eq("workspace_id", membership.workspace_id)
    .eq("id", templateId)
    .eq("is_active", true)
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
  redirect(`/dashboard/events/${eventId}?tab=checklist&checklist_run=${run.id}`);
}

type ChecklistItemInput = { id: string; label: string; checked: boolean; note: string };

export async function saveChecklist(formData: FormData) {
  const { supabase, user, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const eventId = String(formData.get("event_id") ?? "");
  const runId = String(formData.get("run_id") ?? "");
  const intent = String(formData.get("intent") ?? "save");
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
    .select("id")
    .eq("workspace_id", membership.workspace_id)
    .eq("event_id", eventId)
    .eq("id", runId)
    .single();
  if (!run) redirect(`/dashboard/events/${eventId}?error=checklist`);

  const snapshot = items.map(({ id, label, position, is_required }) => ({ id, label, position, is_required }));

  await supabase.from("checklist_item_results").delete().eq("checklist_run_id", runId);
  const { error: resultError } = await supabase.from("checklist_item_results").insert(
    items.map((item, position) => ({
      workspace_id: membership.workspace_id,
      checklist_run_id: runId,
      template_item_id: null,
      response: { item_id: snapshot[position]?.id ?? item.id, checked: item.checked },
      note: item.note || null,
      completed_by: user.id,
      completed_at: new Date().toISOString(),
    })),
  );
  if (resultError) redirect(`/dashboard/events/${eventId}?error=checklist`);
  const { error: runError } = await supabase.from("checklist_runs").update({
    template_snapshot: snapshot,
    status: intent === "complete" ? "complete" : "open",
  }).eq("workspace_id", membership.workspace_id).eq("id", runId);
  if (runError) redirect(`/dashboard/events/${eventId}?error=checklist`);
  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function saveChecklistTemplate(formData: FormData) {
  const { supabase, membership } = await authContext();
  if (!membership) redirect("/dashboard");
  const templateId = String(formData.get("template_id") ?? "") || null;
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  let submitted: unknown;
  try { submitted = JSON.parse(String(formData.get("items_json") ?? "[]")); } catch { submitted = []; }
  const items = (Array.isArray(submitted) ? submitted : []).slice(0, 75)
    .map((item) => ({ label: String((item as { label?: unknown }).label ?? "").trim().slice(0, 240) }))
    .filter((item) => item.label);
  const returnPath = templateId ? `/dashboard/checklists/${templateId}/edit` : "/dashboard/checklists/new";
  if (!name || !items.length) redirect(`${returnPath}?error=required`);
  const { error } = await supabase.rpc("save_checklist_template", {
    p_workspace_id: membership.workspace_id,
    p_template_id: templateId,
    p_name: name,
    p_items: items,
  });
  if (error) redirect(`${returnPath}?error=save`);
  revalidatePath("/dashboard/checklists");
  redirect(`/dashboard/checklists?saved=${templateId ? "updated" : "created"}`);
}

export async function deleteChecklistTemplate(formData: FormData) {
  const { supabase, membership } = await authContext();
  const templateId = String(formData.get("template_id") ?? "");
  if (!membership || !templateId) redirect("/dashboard/checklists");
  const { count } = await supabase.from("checklist_runs").select("id", { count: "exact", head: true })
    .eq("workspace_id", membership.workspace_id).eq("template_id", templateId);
  if (count) redirect("/dashboard/checklists?error=used");
  const { data, error } = await supabase.from("checklist_templates").delete()
    .eq("workspace_id", membership.workspace_id).eq("id", templateId).select("id").maybeSingle();
  if (error || !data) redirect("/dashboard/checklists?error=delete");
  revalidatePath("/dashboard/checklists");
  redirect("/dashboard/checklists?deleted=1");
}
