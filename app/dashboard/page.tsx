import Link from "next/link";
import { createBallPitWorkspace } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

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
  sessions: { count: number }[];
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: membership } = await supabase
    .from("memberships")
    .select("workspace_id, role, workspaces(name)")
    .eq("user_id", user!.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return (
      <main className="dashboard-main onboarding">
        <p className="eyebrow">FIRST LAP</p>
        <h1>Build your paddock.</h1>
        <p className="lede dark">Create the private Ball Pit workspace and load the starting vehicles and safety checklist.</p>
        <form action={createBallPitWorkspace}>
          <button className="button primary">Create Ball Pit workspace</button>
        </form>
      </main>
    );
  }

  const [{ data: events }, { count: vehicleCount }, { count: sessionCount }] = await Promise.all([
    supabase.from("events")
      .select("id,business_id,event_date,event_name,track_name,configuration_name,organization_name,status,vehicles(name),sessions(count)")
      .eq("workspace_id", membership.workspace_id)
      .order("event_date", { ascending: false })
      .limit(12),
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("workspace_id", membership.workspace_id),
    supabase.from("sessions").select("id", { count: "exact", head: true }).eq("workspace_id", membership.workspace_id),
  ]);

  const rows = (events ?? []) as unknown as EventRow[];
  const upcoming = rows.filter((event) => event.status === "planned").length;

  return (
    <main className="dashboard-main">
      <section className="page-hero compact">
        <div>
          <p className="eyebrow">BALL PIT WORKSPACE</p>
          <h1>Track life.<br />Handled.</h1>
        </div>
        <Link className="button primary" href="/dashboard/events/new">Create event</Link>
      </section>

      <section className="stat-grid" aria-label="Workspace summary">
        <div className="stat-card"><strong>{rows.length}</strong><span>Recent events</span></div>
        <div className="stat-card"><strong>{sessionCount ?? 0}</strong><span>Sessions logged</span></div>
        <div className="stat-card"><strong>{vehicleCount ?? 0}</strong><span>Vehicles</span></div>
        <div className="stat-card accent"><strong>{upcoming}</strong><span>Upcoming</span></div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><p className="eyebrow">EVENT INDEX</p><h2>Latest activity</h2></div>
          <Link href="/dashboard/events/new">Add event →</Link>
        </div>
        {rows.length ? (
          <div className="event-list">
            {rows.map((event) => (
              <Link className="event-row" href={`/dashboard/events/${event.id}`} key={event.id}>
                <time>{new Date(`${event.event_date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</time>
                <div><strong>{event.event_name}</strong><span>{event.track_name} · {event.configuration_name}</span></div>
                <div className="event-meta"><span>{event.organization_name || "Independent"}</span><b>{event.sessions?.[0]?.count ?? 0} sessions</b></div>
                <span className={`status-pill ${event.status}`}>{event.status.replace("_", " ")}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state"><strong>No events yet.</strong><p>Create the first Event ID, then add sessions to it.</p></div>
        )}
      </section>
    </main>
  );
}
