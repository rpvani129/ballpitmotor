import Link from "next/link";
import { notFound } from "next/navigation";
import { startChecklist } from "@/app/actions";
import { formatLap } from "@/lib/grid";
import { createClient } from "@/lib/supabase/server";
import ChecklistEditor from "./ChecklistEditor";
import AttachmentManager from "./AttachmentManager";

type Event = {
  id: string;
  business_id: string;
  event_date: string;
  event_name: string;
  track_name: string;
  configuration_name: string;
  organization_name: string | null;
  event_type: string | null;
  team_name: string | null;
  driver_name: string | null;
  temperature_f: number | null;
  conditions: string | null;
  precipitation_in: number | null;
  wind_speed_mph: number | null;
  humidity_pct: number | null;
  track_condition: string | null;
  tire_set_business_id: string | null;
  front_pad_set_business_id: string | null;
  rear_pad_set_business_id: string | null;
  tire_sets: { business_id: string } | null;
  front_pad_sets: { business_id: string } | null;
  rear_pad_sets: { business_id: string } | null;
  notes: string | null;
  vehicle_id: string | null;
  vehicles: { name: string } | null;
};

type Session = {
  id: string;
  session_number: number;
  started_at: string | null;
  best_lap_ms: number | null;
  is_fastest: boolean;
  source_url: string | null;
  notes: string | null;
};

type ChecklistRun = {
  id: string;
  status: string;
  template_snapshot: { id: string; label: string; position: number }[];
};

type ChecklistResult = { response: { item_id?: string; checked?: boolean } | null; template_item_id: string | null; note: string | null };
type ChecklistAttachment = { id: string; checklist_item_key: string; storage_path: string; file_name: string; mime_type: string; file_size_bytes: number };
type EventNote = { id: string; category: string; body: string; created_by: string; created_at: string; updated_at: string };
type EventAttachment = { id: string; storage_path: string; file_name: string; mime_type: string; file_size_bytes: number; attachment_type: string; caption: string | null; created_at: string };

export default async function EventPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data: rawEvent }, { data: rawSessions }, { data: rawRun }, { data: rawNotes }, { data: rawAttachments }, { data: authData }] = await Promise.all([
    supabase.from("events").select("*,vehicles(name),tire_sets!events_tire_set_fkey(business_id),front_pad_sets:pad_sets!events_front_pad_set_fkey(business_id),rear_pad_sets:pad_sets!events_rear_pad_set_fkey(business_id)").eq("id", id).single(),
    supabase.from("sessions").select("id,session_number,started_at,best_lap_ms,is_fastest,source_url,notes").eq("event_id", id).order("session_number"),
    supabase.from("checklist_runs").select("id,status,template_snapshot").eq("event_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("event_notes").select("id,category,body,created_by,created_at,updated_at").eq("event_id", id).order("created_at", { ascending: false }),
    supabase.from("event_attachments").select("id,storage_path,file_name,mime_type,file_size_bytes,attachment_type,caption,created_at").eq("event_id", id).order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);
  if (!rawEvent) notFound();
  const event = rawEvent as unknown as Event;
  const sessions = (rawSessions ?? []) as Session[];
  const run = rawRun as ChecklistRun | null;
  const notes = (rawNotes ?? []) as EventNote[];
  const attachments = (rawAttachments ?? []) as EventAttachment[];
  const authorIds = [...new Set(notes.map((note) => note.created_by))];
  const { data: authors } = authorIds.length ? await supabase.from("people").select("linked_user_id,display_name").in("linked_user_id", authorIds) : { data: [] };
  const authorNames = new Map((authors ?? []).map((author) => [author.linked_user_id, author.display_name]));
  const [{ data: rawResults }, { data: rawChecklistAttachments }] = run ? await Promise.all([
    supabase.from("checklist_item_results").select("template_item_id,response,note").eq("checklist_run_id", run.id),
    supabase.from("checklist_item_attachments").select("id,checklist_item_key,storage_path,file_name,mime_type,file_size_bytes").eq("checklist_run_id", run.id).order("created_at"),
  ]) : [{ data: [] }, { data: [] }];
  const results = (rawResults ?? []) as ChecklistResult[];
  const resultByItem = new Map(results.map((result) => [result.response?.item_id ?? result.template_item_id, result]));
  const checklistItems = run ? [...run.template_snapshot].sort((a, b) => a.position - b.position).map((item) => ({ id: item.id, label: item.label, checked: resultByItem.get(item.id)?.response?.checked ?? false, note: resultByItem.get(item.id)?.note ?? "" })) : [];
  const checklistAttachments = (rawChecklistAttachments ?? []) as ChecklistAttachment[];
  const timedLaps = sessions.map((session) => session.best_lap_ms).filter((lap): lap is number => lap != null);
  const eventFastestLap = timedLaps.length ? Math.min(...timedLaps) : null;
  const requestedTab = query.tab ?? "sessions";
  const activeTab = ["sessions", "checklist", "notes", "attachments"].includes(requestedTab) ? requestedTab : "sessions";

  return (
    <main className="dashboard-main">
      <Link className="back-link" href="/dashboard">← Event Index</Link>
      <section className="event-hero">
        <div>
          <p className="eyebrow">{event.business_id}</p>
          <h1>{event.event_name}</h1>
          <p className="event-location">{event.track_name} · {event.configuration_name}</p>
        </div>
        <div className="event-hero-actions"><Link className="button dark" href={`/dashboard/events/${event.id}/edit`}>Edit event</Link><div className="date-block"><strong>{new Date(`${event.event_date}T12:00:00`).toLocaleDateString("en-US", { day: "2-digit" })}</strong><span>{new Date(`${event.event_date}T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span></div></div>
      </section>

      {query.error && <p className="alert">That record could not be saved. Check the fields and try again.</p>}

      <section className="event-facts">
        <div><span>Vehicle</span><strong>{event.vehicles?.name ?? "—"}</strong></div>
        <div><span>Driver</span><strong>{event.driver_name ?? "—"}</strong></div>
        <div><span>Team</span><strong>{event.team_name ?? "—"}</strong></div>
        <div><span>Organization</span><strong>{event.organization_name ?? "Independent"}</strong></div>
        <div className="fastest-fact"><span>Fastest lap</span><strong>{formatLap(eventFastestLap)}</strong></div>
      </section>

      <nav className="record-tabs" aria-label="Event sections">
        <Link className={activeTab === "sessions" ? "active" : ""} href={`/dashboard/events/${id}?tab=sessions`}>Sessions <span>{sessions.length}</span></Link>
        <Link className={activeTab === "checklist" ? "active" : ""} href={`/dashboard/events/${id}?tab=checklist`}>Checklist {run && <span>{run.status === "complete" ? "Done" : "Open"}</span>}</Link>
        <Link className={activeTab === "notes" ? "active" : ""} href={`/dashboard/events/${id}?tab=notes`}>Notes <span>{notes.length}</span></Link>
        <Link className={activeTab === "attachments" ? "active" : ""} href={`/dashboard/events/${id}?tab=attachments`}>Attachments <span>{attachments.length}</span></Link>
      </nav>

      {activeTab === "sessions" && <div className="event-content-grid">
        <section className="section-block">
          <div className="section-heading"><div><p className="eyebrow">LAP TIMES</p><h2>Sessions</h2></div><div className="section-heading-actions"><span>{sessions.length} logged</span><Link className="button primary" href={`/dashboard/events/${event.id}/sessions/new`}>+ Add session</Link></div></div>
          {sessions.length ? <div className="session-table">
            <div className="session-head"><span>Session</span><span>Start</span><span>Best lap</span><span></span></div>
            {sessions.map((session) => <Link href={`/dashboard/events/${event.id}/sessions/${session.id}/edit`} className={session.is_fastest ? "session-row fastest" : "session-row"} key={session.id}>
              <strong>{String(session.session_number).padStart(2, "0")}</strong><span>{session.started_at?.slice(0, 5) ?? "—"}</span><b>{session.best_lap_ms ? formatLap(session.best_lap_ms) : "Usage only"}</b><span>{session.is_fastest ? "FASTEST" : ""}</span>
            </Link>)}
          </div> : <div className="empty-state compact"><strong>No sessions yet.</strong><p>Use Add Session to log the first result.</p></div>}
        </section>

        <aside className="event-sidebar">
          <section className="weather-card">
            <div><p className="eyebrow">EVENT WEATHER</p><strong>{event.temperature_f != null ? `${event.temperature_f.toFixed(0)}°` : "—"}</strong></div>
            <h2>{event.conditions ?? "Weather pending"}</h2>
            <dl><div><dt>Track</dt><dd>{event.track_condition ?? "—"}</dd></div><div><dt>Wind</dt><dd>{event.wind_speed_mph != null ? `${event.wind_speed_mph.toFixed(1)} mph` : "—"}</dd></div><div><dt>Humidity</dt><dd>{event.humidity_pct != null ? `${event.humidity_pct.toFixed(0)}%` : "—"}</dd></div><div><dt>Rain</dt><dd>{event.precipitation_in != null ? `${event.precipitation_in.toFixed(2)} in` : "—"}</dd></div></dl>
          </section>
          <section className="setup-card"><p className="eyebrow">ON THE CAR</p><h2>Event setup</h2><dl><div><dt>Tires</dt><dd><Link target="_blank" rel="noreferrer" href="/dashboard/consumables?tab=tires">{event.tire_sets?.business_id ?? event.tire_set_business_id ?? "View tires"} ↗</Link></dd></div><div><dt>Front pads</dt><dd><Link target="_blank" rel="noreferrer" href="/dashboard/consumables?tab=pads">{event.front_pad_sets?.business_id ?? event.front_pad_set_business_id ?? "View pads"} ↗</Link></dd></div><div><dt>Rear pads</dt><dd><Link target="_blank" rel="noreferrer" href="/dashboard/consumables?tab=pads">{event.rear_pad_sets?.business_id ?? event.rear_pad_set_business_id ?? "View pads"} ↗</Link></dd></div></dl><Link className="setup-edit-link" href={`/dashboard/events/${event.id}/edit`}>Reassign event setup →</Link></section>
        </aside>
      </div>}

      {activeTab === "checklist" && <section className="section-block checklist-block tab-panel">
        <div className="section-heading"><div><p className="eyebrow">PRE-EVENT</p><h2>Safety checklist</h2></div>{run && <span className={`status-pill ${run.status}`}>{run.status}</span>}</div>
        {!run ? <form action={startChecklist}><input type="hidden" name="event_id" value={event.id} /><input type="hidden" name="vehicle_id" value={event.vehicle_id ?? ""} /><button className="button dark">Start pre-event checklist</button></form> :
          <ChecklistEditor workspaceId={rawEvent.workspace_id} eventId={event.id} runId={run.id} initialItems={checklistItems} initialAttachments={checklistAttachments} />}
      </section>}

      {activeTab === "notes" && <section className="section-block tab-panel"><div className="section-heading"><div><p className="eyebrow">EVENT JOURNAL</p><h2>Notes</h2></div><div className="section-heading-actions"><span>{notes.length} entries</span><Link className="button primary" href={`/dashboard/events/${event.id}/notes/new`}>+ Add note</Link></div></div>{notes.length ? <div className="event-note-list">{notes.map((note) => { const created = new Date(note.created_at); const edited = note.updated_at !== note.created_at; const author = note.created_by === authData.user?.id ? "You" : authorNames.get(note.created_by) ?? "Workspace member"; return <Link className="event-note-card" href={`/dashboard/events/${event.id}/notes/${note.id}/edit`} key={note.id}><div className="event-note-meta"><span>{note.category}</span><time dateTime={note.created_at}>{created.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {created.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</time></div><p>{note.body}</p><small>{author}{edited ? " · Edited" : ""} · Edit →</small></Link>; })}</div> : <div className="empty-state"><strong>No event notes yet.</strong><p>Add plans, setup decisions, observations, incidents, results, or follow-up.</p></div>}</section>}

      {activeTab === "attachments" && <section className="section-block tab-panel"><div className="section-heading"><div><p className="eyebrow">EVENT FILES</p><h2>Attachments</h2></div><span>{attachments.length} files</span></div><AttachmentManager workspaceId={rawEvent.workspace_id} eventId={event.id} initialAttachments={attachments} /></section>}
    </main>
  );
}
