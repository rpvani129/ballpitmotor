import Link from "next/link";
import { notFound } from "next/navigation";
import { formatLap } from "@/lib/grid";
import { createClient } from "@/lib/supabase/server";

type Setup = { description: string; code: string } | null;
type PublicEvent = { business_id: string; event_date: string; event_name: string; track_name: string; configuration_name: string; organization_name: string | null; vehicle_name: string | null; temperature_f: number | null; conditions: string | null; wind_speed_mph: number | null; humidity_pct: number | null; precipitation_in: number | null; track_condition: string | null; tire: Setup; front_pad: Setup; rear_pad: Setup };
type Session = { session_number: number; started_at: string | null; best_lap_ms: number | null; is_fastest: boolean };
type PublicDetail = { workspace: { name: string }; event: PublicEvent; sessions: Session[] };

const setupValue = (setup: Setup) => setup ? <><strong>{setup.description}</strong><small>{setup.code}</small></> : <span>Not recorded</span>;

export default async function PublicEventPage({ params }: { params: Promise<{ workspace: string; eventId: string }> }) {
  const { workspace, eventId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_event", { requested_workspace_slug: workspace, requested_event_id: eventId });
  const result = data as PublicDetail | null;
  if (!result) notFound();
  const event = result.event;
  const laps = result.sessions.map((session) => session.best_lap_ms).filter((lap): lap is number => lap != null);
  return <main className="public-main">
    <Link className="back-link" href={`/events/${workspace}`}>← Public event index</Link>
    <section className="event-hero"><div><p className="eyebrow">{event.business_id}</p><h1>{event.event_name}</h1><p className="event-location">{event.track_name} · {event.configuration_name}</p></div><div className="date-block"><strong>{new Date(`${event.event_date}T12:00:00`).toLocaleDateString("en-US", { day: "2-digit" })}</strong><span>{new Date(`${event.event_date}T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span></div></section>
    <section className="event-facts public-event-facts"><div><span>Vehicle</span><strong>{event.vehicle_name ?? "—"}</strong></div><div><span>Organization</span><strong>{event.organization_name ?? "Independent"}</strong></div><div className="fastest-fact"><span>Fastest lap</span><strong>{formatLap(laps.length ? Math.min(...laps) : null)}</strong></div></section>
    <div className="event-content-grid public-event-detail"><section className="section-block"><div className="section-heading"><div><p className="eyebrow">LAP TIMES</p><h2>Sessions</h2></div><span>{result.sessions.length} logged</span></div><div className="session-table"><div className="session-head"><span>Session</span><span>Start</span><span>Best lap</span><span></span></div>{result.sessions.map((session) => <div className={session.is_fastest ? "session-row fastest" : "session-row"} key={session.session_number}><strong>{String(session.session_number).padStart(2, "0")}</strong><span>{session.started_at?.slice(0, 5) ?? "—"}</span><b>{session.best_lap_ms ? formatLap(session.best_lap_ms) : "Usage only"}</b><span>{session.is_fastest ? "FASTEST" : ""}</span></div>)}</div></section>
      <aside className="event-sidebar"><section className="weather-card"><div><p className="eyebrow">EVENT WEATHER</p><strong>{event.temperature_f != null ? `${event.temperature_f.toFixed(0)}°` : "—"}</strong></div><h2>{event.conditions ?? "Weather not recorded"}</h2><dl><div><dt>Track</dt><dd>{event.track_condition ?? "—"}</dd></div><div><dt>Wind</dt><dd>{event.wind_speed_mph != null ? `${event.wind_speed_mph.toFixed(1)} mph` : "—"}</dd></div><div><dt>Humidity</dt><dd>{event.humidity_pct != null ? `${event.humidity_pct.toFixed(0)}%` : "—"}</dd></div><div><dt>Rain</dt><dd>{event.precipitation_in != null ? `${event.precipitation_in.toFixed(2)} in` : "—"}</dd></div></dl></section><section className="setup-card public-setup"><p className="eyebrow">ON THE CAR</p><h2>Event setup</h2><dl><div><dt>Tires</dt><dd>{setupValue(event.tire)}</dd></div><div><dt>Front pads</dt><dd>{setupValue(event.front_pad)}</dd></div><div><dt>Rear pads</dt><dd>{setupValue(event.rear_pad)}</dd></div></dl></section></aside>
    </div>
  </main>;
}
