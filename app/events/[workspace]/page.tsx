import Link from "next/link";
import { notFound } from "next/navigation";
import { formatLap } from "@/lib/grid";
import { createClient } from "@/lib/supabase/server";

type PublicEvent = { business_id: string; event_date: string; event_name: string; track_name: string; configuration_name: string; organization_name: string | null; vehicle_name: string | null; session_count: number; fastest_lap_ms: number | null };
type PublicIndex = { workspace: { name: string; slug: string }; events: PublicEvent[] };

export default async function PublicEventIndex({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_events", { requested_workspace_slug: workspace });
  const result = data as PublicIndex | null;
  if (!result) notFound();
  return <main className="public-main">
    <section className="public-hero"><div><p className="eyebrow">{result.workspace.name}</p><h1>Lap-time<br />archive.</h1><p>Public events and session results from The Grid.</p></div><div className="public-count"><strong>{result.events.length}</strong><span>events</span></div></section>
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">PUBLIC GRID</p><h2>Events</h2></div></div>
      <div className="public-event-list">{result.events.map((event) => <Link key={event.business_id} href={`/events/${workspace}/${event.business_id}`}><time>{new Date(`${event.event_date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}</time><div><strong>{event.event_name}</strong><span>{event.track_name} · {event.configuration_name}{event.vehicle_name ? ` · ${event.vehicle_name}` : ""}</span></div><div><b>{formatLap(event.fastest_lap_ms)}</b><span>{event.session_count} sessions</span></div></Link>)}</div>
    </section>
  </main>;
}
