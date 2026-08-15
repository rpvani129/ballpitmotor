import { createClient } from "@/lib/supabase/server";
import NewEventForm from "./NewEventForm";

export default async function NewEventPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: vehicles }, { data: tracks }, { data: tires }, { data: pads }, { data: eventTypes }, { data: teams }, { data: profile }] = await Promise.all([
    supabase.from("vehicles").select("id,name,business_id").eq("status", "active").order("name"),
    supabase.from("tracks").select("id,name,short_name,track_configurations(id,name,is_active)").eq("is_active", true).order("name"),
    supabase.from("tire_sets").select("id,business_id,vehicle_id,manufacturer,model,size,compound,is_current").eq("status", "active").order("business_id"),
    supabase.from("pad_sets").select("id,business_id,vehicle_id,axle,manufacturer,model,compound,is_current").eq("status", "active").order("business_id"),
    supabase.from("event_types").select("id,name").order("name"),
    supabase.from("teams").select("id,name").order("name"),
    supabase.from("user_profiles").select("driver_name").eq("user_id", user?.id ?? "00000000-0000-0000-0000-000000000000").maybeSingle(),
  ]);
  const defaultTeamId = teams?.find((team) => team.name === "Ball Pit Motor")?.id ?? "";
  return (
    <main className="dashboard-main">
      <section className="page-title"><p className="eyebrow">EVENT-FIRST WORKFLOW</p><h1>Create event</h1><p>Event Index owns the day. Sessions inherit its car, driver, track, organization, weather and consumables.</p></section>
      {query.error && <p className="alert">{query.error === "selection" ? "The selected track configuration or vehicle equipment does not match. Please reselect the highlighted event details." : query.error === "create" ? "The event could not be saved. Please try again." : "Complete every field marked with a red asterisk."}</p>}
      <NewEventForm vehicles={vehicles ?? []} tracks={tracks ?? []} tires={tires ?? []} pads={pads ?? []} eventTypes={eventTypes ?? []} teams={teams ?? []} defaultTeamId={defaultTeamId} defaultDriverName={profile?.driver_name ?? ""} />
    </main>
  );
}
