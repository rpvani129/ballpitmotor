import Link from "next/link";
import { notFound } from "next/navigation";
import { cloneEventSetup, matchingTrack, matchingConfiguration, type EventSetup } from "@/lib/event-planning";
import { getDriveEvents } from "@/lib/drive-ntx";
import { createClient } from "@/lib/supabase/server";
import NewEventForm from "./NewEventForm";

export default async function NewEventPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const {data:member} = await supabase.from("memberships").select("workspace_id,role").eq("user_id",user?.id ?? "").eq("status","active").limit(1).maybeSingle();
  if (!member || !["owner","admin","editor"].includes(member.role)) return <main className="dashboard-main"><h1>Editor access required</h1><Link href="/dashboard">Back to Events</Link></main>;
  const cloneId = query.clone || "";
  const {data:clone} = cloneId ? await supabase.from("events").select("*").eq("workspace_id",member.workspace_id).eq("id",cloneId).maybeSingle() : {data:null};
  if (cloneId && !clone) notFound();
  const source = query.discover ? (await getDriveEvents()).events.find(event=>event.id===query.discover) : null;
  if (query.discover && !source) return <main className="dashboard-main"><h1>Event listing unavailable</h1><p>The schedule may have changed. Please return to Discover Events.</p><Link href="/dashboard/discover">Discover Events</Link></main>;
  const [{ data: vehicles }, { data: tracks }, { data: tires }, { data: pads }, { data: eventTypes }, { data: teams }, { data: profile }] = await Promise.all([
    supabase.from("vehicles").select("id,name,business_id").eq("workspace_id",member.workspace_id).or(`status.eq.active,id.eq.${clone?.vehicle_id || "00000000-0000-0000-0000-000000000000"}`).order("name"),
    supabase.from("tracks").select("id,name,short_name,track_configurations(id,name,is_active)").eq("workspace_id",member.workspace_id).or(`is_active.eq.true,id.eq.${clone?.track_id || "00000000-0000-0000-0000-000000000000"}`).order("name"),
    supabase.from("tire_sets").select("id,business_id,vehicle_id,manufacturer,model,size,compound,is_current").eq("workspace_id",member.workspace_id).or(`status.eq.active,id.eq.${clone?.tire_set_id || "00000000-0000-0000-0000-000000000000"}`).order("business_id"),
    supabase.from("pad_sets").select("id,business_id,vehicle_id,axle,manufacturer,model,compound,is_current").eq("workspace_id",member.workspace_id).or(`status.eq.active,id.eq.${clone?.front_pad_set_id || "00000000-0000-0000-0000-000000000000"},id.eq.${clone?.rear_pad_set_id || "00000000-0000-0000-0000-000000000000"}`).order("business_id"),
    supabase.from("event_types").select("id,name").eq("workspace_id",member.workspace_id).order("name"),
    supabase.from("teams").select("id,name").eq("workspace_id",member.workspace_id).order("name"),
    supabase.from("user_profiles").select("driver_name").eq("user_id", user?.id ?? "00000000-0000-0000-0000-000000000000").maybeSingle(),
  ]);
  const defaultTeamId = teams?.find((team) => team.name === "Ball Pit Motor")?.id ?? "";
  let initial: EventSetup = clone ? cloneEventSetup(clone) : {};
  if (source) {
    const track = matchingTrack(source.venue, tracks || []);
    const configuration = matchingConfiguration(source.track_configuration, track?.track_configurations || []);
    initial = {event_date:source.start_at.slice(0,10),event_name:source.title,organization_name:source.organizer,track_id:track?.id,configuration_id:configuration?.id,notes:source.schedule_note};
  }
  const mode = clone ? "clone" : source ? "discover" : "new";
  return (
    <main className="dashboard-main">
      <section className="page-title"><p className="eyebrow">EVENT-FIRST WORKFLOW</p><h1>{clone ? "Clone event" : source ? "Plan to attend" : "Create event"}</h1><p>{clone ? "Your setup is copied. Change the date and save for the next day. Sessions, mileage, attachments and checklist progress start fresh." : source ? "Start with the first day. Select your vehicle and confirm the track configuration, then save your plan." : "Event Index owns the day. Sessions inherit its car, driver, track, organization, weather and consumables."}</p></section>
      <Link className="back-link" href={clone ? `/dashboard/events/${clone.id}` : source ? "/dashboard/discover" : "/dashboard"}>← Back</Link>
      {source && <p className="planning-badge">{source.announcement_status ? "Schedule announced · " : ""}This saves one day; clone the setup to add another day.</p>}
      {query.error && <p className="alert">{query.error === "same_date" ? "Choose a different date for the cloned event." : query.error === "source" ? "The source event is unavailable. Return to Discover Events and try again." : query.error === "selection" ? "The selected track configuration or vehicle equipment does not match. Please reselect the highlighted event details." : query.error === "create" ? "The event could not be saved. Please try again." : "Complete every field marked with a red asterisk."}</p>}
      <NewEventForm key={`${mode}-${cloneId || source?.id || "new"}`} initial={initial} mode={mode} cloneId={clone?.id || ""} discoverId={source?.id || ""} expandSetup={Boolean(query.error)} vehicles={vehicles ?? []} tracks={tracks ?? []} tires={tires ?? []} pads={pads ?? []} eventTypes={eventTypes ?? []} teams={teams ?? []} defaultTeamId={defaultTeamId} defaultDriverName={profile?.driver_name ?? ""} />
    </main>
  );
}
