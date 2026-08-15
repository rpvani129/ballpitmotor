import Link from "next/link";
import { createBallPitWorkspace, updateFirstTimeSettings } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import EventIndex from "./EventIndex";
import EventShareDialog from "./EventShareDialog";
import FirstTimeDialog from "./FirstTimeDialog";

type EventRow = {
  id: string;
  business_id: string;
  event_date: string;
  event_name: string;
  track_name: string;
  configuration_name: string;
  organization_name: string | null;
  status: string;
  vehicles: { name: string } | null;
  sessions: { best_lap_ms: number | null }[];
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: membership } = await supabase
    .from("memberships")
    .select("workspace_id, role, workspaces(name,slug)")
    .eq("user_id", user!.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return (
      <main className="dashboard-main onboarding">
        <p className="eyebrow">FIRST LAP</p>
        <h1>Build your paddock.</h1>
        <p className="lede dark">Create your private workspace with starter tracks and the pre-event safety checklist.</p>
        <form action={createBallPitWorkspace}>
          <button className="button primary">Create my workspace</button>
        </form>
      </main>
    );
  }

  const [{ data: events }, { count: vehicleCount }, { count: sessionCount }, { data: eventSettings }, { data: userProfile }] = await Promise.all([
    supabase.from("events")
      .select("id,business_id,event_date,event_name,track_name,configuration_name,organization_name,status,vehicles(name),sessions(best_lap_ms)")
      .eq("workspace_id", membership.workspace_id)
      .order("event_date", { ascending: false })
      .order("business_id", { ascending: false }),
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("workspace_id", membership.workspace_id),
    supabase.from("sessions").select("id", { count: "exact", head: true }).eq("workspace_id", membership.workspace_id),
    supabase.from("event_settings").select("show_public_events,show_first_time_popup").eq("workspace_id", membership.workspace_id).maybeSingle(),
    supabase.from("user_profiles").select("public_slug").eq("user_id", user!.id).single(),
  ]);

  const rows = (events ?? []) as unknown as EventRow[];
  const upcoming = rows.filter((event) => event.status === "planned").length;

  return (
    <main className="dashboard-main">
      {(eventSettings?.show_first_time_popup ?? true) && <FirstTimeDialog action={updateFirstTimeSettings} />}
      {query.deleted === "event" && <p className="success-message">Event deleted.</p>}
      <section className="page-hero compact">
        <div>
          <p className="eyebrow">BALL PIT WORKSPACE</p>
          <h1>Track life.<br />Handled.</h1>
        </div>
        <div className="hero-actions"><EventShareDialog workspaceSlug={userProfile!.public_slug} publicEnabled={eventSettings?.show_public_events ?? false} events={rows} /><Link className="button ghost" href="/dashboard/settings/events">Event settings</Link><Link className="button primary" href="/dashboard/events/new">Create event</Link></div>
      </section>

      <section className="stat-grid" aria-label="Workspace summary">
        <div className="stat-card"><strong>{rows.length}</strong><span>All events</span></div>
        <div className="stat-card"><strong>{sessionCount ?? 0}</strong><span>Sessions logged</span></div>
        <div className="stat-card"><strong>{vehicleCount ?? 0}</strong><span>Vehicles</span></div>
        <div className="stat-card accent"><strong>{upcoming}</strong><span>Upcoming</span></div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><p className="eyebrow">EVENT INDEX</p><h2>All events</h2></div>
          <Link href="/dashboard/events/new">Add event →</Link>
        </div>
        {rows.length ? <EventIndex events={rows} /> : (
          <div className="empty-state"><strong>No events yet.</strong><p>Create the first Event ID, then add sessions to it.</p></div>
        )}
      </section>
    </main>
  );
}
