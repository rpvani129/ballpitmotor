"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatLap } from "@/lib/grid";

type Session = { id: string; session_number: number; started_at: string | null; best_lap_ms: number | null };
type Event = {
  id: string; business_id: string; event_date: string; event_name: string; event_type: string | null; event_type_id: string | null;
  track_name: string; configuration_name: string; organization_name: string | null; status: string; vehicle_id: string | null;
  team_id: string | null; team_name: string | null; driver_name: string | null; temperature_f: number | null; conditions: string | null;
  precipitation_in: number | null; wind_speed_mph: number | null; humidity_pct: number | null; track_condition: string | null;
  tire_set_id: string | null; front_pad_set_id: string | null; rear_pad_set_id: string | null;
  vehicles: { id: string; name: string } | null; sessions: Session[];
};
type Tire = { id: string; business_id: string; manufacturer: string; model: string; size: string | null; starting_sessions: number | null; status: string; vehicles: { name: string } | null };
type Pad = { id: string; business_id: string; axle: "front" | "rear"; manufacturer: string; model: string; compound: string | null; starting_sessions: number | null; status: string; vehicles: { name: string } | null };
type Tab = "bests" | "progression" | "utilization" | "consumables" | "quality";
type QualityIssue = { key: string; event: Event; level: "record" | "session"; title: string; detail: string; session?: Session };
type Review = { issue_key: string; resolution: "confirmed" | "intentionally_missing"; resolved_at: string };

const eventFastest = (event: Event) => {
  const laps = event.sessions.map((session) => session.best_lap_ms).filter((lap): lap is number => lap != null);
  return laps.length ? Math.min(...laps) : null;
};
const displayDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function ReportsClient({ events, tires, pads, reviews, resolveAction, reopenAction }: { events: Event[]; tires: Tire[]; pads: Pad[]; reviews: Review[]; resolveAction: (formData: FormData) => Promise<void>; reopenAction: (formData: FormData) => Promise<void> }) {
  const [tab, setTab] = useState<Tab>("bests");
  const [vehicle, setVehicle] = useState("");
  const [driver, setDriver] = useState("");
  const [track, setTrack] = useState("");
  const [configuration, setConfiguration] = useState("");
  const [qualityFilter, setQualityFilter] = useState("all");
  const [qualityStatus, setQualityStatus] = useState<"open" | "resolved">("open");

  const vehicles = useMemo(() => [...new Set(events.map((event) => event.vehicles?.name).filter(Boolean) as string[])].sort(), [events]);
  const drivers = useMemo(() => [...new Set(events.map((event) => event.driver_name).filter(Boolean) as string[])].sort(), [events]);
  const tracks = useMemo(() => [...new Set(events.map((event) => event.track_name))].sort(), [events]);
  const configurations = useMemo(() => [...new Set(events.filter((event) => !track || event.track_name === track).map((event) => event.configuration_name))].sort(), [events, track]);
  const filtered = useMemo(() => events.filter((event) =>
    (!vehicle || event.vehicles?.name === vehicle) && (!driver || event.driver_name === driver) &&
    (!track || event.track_name === track) && (!configuration || event.configuration_name === configuration)
  ), [events, vehicle, driver, track, configuration]);

  const personalBests = useMemo(() => {
    const groups = new Map<string, { event: Event; lap: number }>();
    filtered.forEach((event) => {
      const lap = eventFastest(event); if (lap == null) return;
      const key = [event.vehicles?.name ?? "Unknown", event.driver_name ?? "Unknown", event.track_name, event.configuration_name].join("|");
      const current = groups.get(key); if (!current || lap < current.lap) groups.set(key, { event, lap });
    });
    return [...groups.values()].sort((a, b) => a.lap - b.lap);
  }, [filtered]);

  const progression = useMemo(() => track && configuration ? filtered.map((event) => ({ event, lap: eventFastest(event) })).filter((row): row is { event: Event; lap: number } => row.lap != null) : [], [filtered, track, configuration]);
  const progressionMin = progression.length ? Math.min(...progression.map((row) => row.lap)) : 0;
  const progressionMax = progression.length ? Math.max(...progression.map((row) => row.lap)) : 0;

  const utilization = useMemo(() => {
    const map = new Map<string, { vehicle: string; events: number; sessions: number; timed: number; rentals: number; last: string }>();
    filtered.forEach((event) => {
      const name = event.vehicles?.name ?? "Unassigned";
      const row = map.get(name) ?? { vehicle: name, events: 0, sessions: 0, timed: 0, rentals: 0, last: "" };
      row.events += 1; row.sessions += event.sessions.length; row.timed += event.sessions.filter((session) => session.best_lap_ms != null).length;
      if (/rental/i.test(`${event.event_type ?? ""} ${event.event_name} ${event.team_name ?? ""}`)) row.rentals += event.sessions.length;
      if (event.event_date > row.last) row.last = event.event_date; map.set(name, row);
    });
    return [...map.values()].sort((a, b) => b.sessions - a.sessions);
  }, [filtered]);
  const rentalHistory = useMemo(() => filtered.filter((event) => /rental/i.test(`${event.event_type ?? ""} ${event.event_name} ${event.team_name ?? ""}`)).sort((a, b) => b.event_date.localeCompare(a.event_date)), [filtered]);

  const consumableUsage = useMemo(() => {
    const sessionCount = (id: string, field: "tire_set_id" | "front_pad_set_id" | "rear_pad_set_id") => events.filter((event) => event[field] === id).reduce((sum, event) => sum + event.sessions.length, 0);
    return {
      tires: tires.map((item) => ({ ...item, calculated: sessionCount(item.id, "tire_set_id"), total: item.starting_sessions == null ? null : item.starting_sessions + sessionCount(item.id, "tire_set_id") })).sort((a, b) => Number(b.status === "active") - Number(a.status === "active") || b.calculated - a.calculated),
      pads: pads.map((item) => ({ ...item, calculated: sessionCount(item.id, item.axle === "front" ? "front_pad_set_id" : "rear_pad_set_id"), total: item.starting_sessions == null ? null : item.starting_sessions + sessionCount(item.id, item.axle === "front" ? "front_pad_set_id" : "rear_pad_set_id") })).sort((a, b) => Number(b.status === "active") - Number(a.status === "active") || b.calculated - a.calculated),
    };
  }, [events, tires, pads]);

  const qualityIssues = useMemo(() => {
    const issues: QualityIssue[] = [];
    events.forEach((event) => {
      const add = (key: string, title: string, detail: string) => issues.push({ key: `${event.id}-${key}`, event, level: "record", title, detail });
      if (!event.event_type_id) add("event-type", "Missing Event Type", "Assign a controlled Event Type.");
      if (!event.vehicle_id) add("vehicle", "Missing vehicle", "Assign the vehicle used for this event.");
      if (!event.driver_name?.trim()) add("driver", "Missing driver", "Add the event driver.");
      if ([event.temperature_f, event.conditions, event.wind_speed_mph, event.humidity_pct, event.track_condition].some((value) => value == null || value === "")) add("weather", "Incomplete weather", "Review the event-level weather record.");
      if (!event.tire_set_id) add("tire", "Missing tire assignment", "Assign a tire set or confirm historical data is unavailable.");
      if (!event.front_pad_set_id) add("front-pad", "Missing front pad assignment", "Assign a front pad set or confirm historical data is unavailable.");
      if (!event.rear_pad_set_id) add("rear-pad", "Missing rear pad assignment", "Assign a rear pad set or confirm historical data is unavailable.");
      if (!event.sessions.length && event.status === "complete") add("sessions", "Completed event has no sessions", "Add sessions or verify the event should remain empty.");
      event.sessions.forEach((session) => {
        if (session.best_lap_ms == null) issues.push({ key: `${session.id}-lap`, event, session, level: "session", title: "Missing lap time", detail: "Add the lap or confirm timing was not provided." });
        if (session.started_at == null) issues.push({ key: `${session.id}-start`, event, session, level: "session", title: "Missing start time", detail: "Add the session start time or confirm it is unknown." });
      });
    });
    const duplicateGroups = new Map<string, Event[]>();
    events.forEach((event) => { const key = [event.event_date, event.track_name, event.configuration_name, event.vehicle_id ?? ""].join("|"); duplicateGroups.set(key, [...(duplicateGroups.get(key) ?? []), event]); });
    duplicateGroups.forEach((group) => { if (group.length > 1) group.forEach((event) => issues.push({ key: `${event.id}-duplicate`, event, level: "record", title: "Possible duplicate event", detail: `${group.length} events share this date, vehicle, track, and configuration. Review before changing.` })); });
    return issues;
  }, [events]);
  const reviewMap = new Map(reviews.map((review) => [review.issue_key, review]));
  const visibleIssues = qualityIssues.filter((issue) => (qualityStatus === "resolved") === reviewMap.has(issue.key) && (qualityFilter === "all" || issue.title === qualityFilter));
  const openIssueCount = qualityIssues.filter((issue) => !reviewMap.has(issue.key)).length;
  const issueTypes = [...new Set(qualityIssues.map((issue) => issue.title))].sort();

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "bests", label: "Personal bests", count: personalBests.length }, { id: "progression", label: "Progression", count: progression.length },
    { id: "utilization", label: "Utilization", count: utilization.length }, { id: "consumables", label: "Tire + pad life", count: tires.length + pads.length },
    { id: "quality", label: "Data quality", count: openIssueCount },
  ];

  return <>
    <section className="report-summary" aria-label="Report summary">
      <div><strong>{personalBests.length}</strong><span>Personal-best combinations</span></div><div><strong>{filtered.reduce((sum, event) => sum + event.sessions.length, 0)}</strong><span>Sessions in view</span></div><div><strong>{utilization.reduce((sum, row) => sum + row.rentals, 0)}</strong><span>Rental sessions</span></div><div className={openIssueCount ? "warning" : "good"}><strong>{openIssueCount}</strong><span>Items to reconcile</span></div>
    </section>
    <div className="report-tabs" role="tablist">{tabs.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)} role="tab" aria-selected={tab === item.id}>{item.label}<span>{item.count}</span></button>)}</div>
    {tab !== "consumables" && tab !== "quality" && <div className="report-filters">
      <label>Vehicle<select value={vehicle} onChange={(e) => setVehicle(e.target.value)}><option value="">All vehicles</option>{vehicles.map((name) => <option key={name}>{name}</option>)}</select></label>
      <label>Driver<select value={driver} onChange={(e) => setDriver(e.target.value)}><option value="">All drivers</option>{drivers.map((name) => <option key={name}>{name}</option>)}</select></label>
      <label>Track<select value={track} onChange={(e) => { setTrack(e.target.value); setConfiguration(""); }}><option value="">All tracks</option>{tracks.map((name) => <option key={name}>{name}</option>)}</select></label>
      <label>Configuration<select value={configuration} onChange={(e) => setConfiguration(e.target.value)}><option value="">All configurations</option>{configurations.map((name) => <option key={name}>{name}</option>)}</select></label>
    </div>}

    {tab === "bests" && <ReportSection eyebrow="BENCHMARKS" title="Personal bests" note="Best recorded session for every vehicle, driver, track, and configuration combination."><div className="report-table pb-table"><div className="report-table-head"><span>Best lap</span><span>Vehicle + driver</span><span>Track + configuration</span><span>Date</span></div>{personalBests.map(({ event, lap }) => <Link href={`/dashboard/events/${event.id}`} className="report-table-row" key={`${event.id}-${lap}`}><b className="lap-value">{formatLap(lap)}</b><div><strong>{event.vehicles?.name ?? "Unassigned"}</strong><span>{event.driver_name ?? "Unknown driver"}</span></div><div><strong>{event.track_name}</strong><span>{event.configuration_name}</span></div><time>{displayDate(event.event_date)}</time></Link>)}</div></ReportSection>}

    {tab === "progression" && <ReportSection eyebrow="TREND" title="Lap-time progression" note="Comparable records are controlled by the filters above. Lower bars are faster.">{progression.length ? <div className="progression-chart">{progression.map(({ event, lap }) => { const range = Math.max(1, progressionMax - progressionMin); const width = 35 + ((lap - progressionMin) / range) * 65; return <Link href={`/dashboard/events/${event.id}`} className="progression-row" key={event.id}><time>{displayDate(event.event_date)}</time><div className="progression-bar-track"><span style={{ width: `${width}%` }} /></div><strong>{formatLap(lap)}</strong><small>{event.vehicles?.name} · {event.track_name} · {event.configuration_name}</small></Link>; })}</div> : <Empty text="Choose a track and configuration with recorded lap times." />}</ReportSection>}

    {tab === "utilization" && <ReportSection eyebrow="HISTORY" title="Vehicle utilization" note="Rental sessions are identified from the event type, event name, or assigned team."><div className="report-table utilization-table"><div className="report-table-head"><span>Vehicle</span><span>Events</span><span>Sessions</span><span>Timed</span><span>Rental</span><span>Last event</span></div>{utilization.map((row) => <div className="report-table-row" key={row.vehicle}><strong>{row.vehicle}</strong><b>{row.events}</b><b>{row.sessions}</b><span>{row.timed}</span><span>{row.rentals}</span><time>{row.last ? displayDate(row.last) : "—"}</time></div>)}</div><h3 className="report-subhead">Rental history</h3>{rentalHistory.length ? <div className="report-table rental-history-table"><div className="report-table-head"><span>Date</span><span>Vehicle</span><span>Driver</span><span>Event</span><span>Sessions</span></div>{rentalHistory.map((event) => <Link href={`/dashboard/events/${event.id}`} className="report-table-row" key={event.id}><time>{displayDate(event.event_date)}</time><strong>{event.vehicles?.name ?? "Unassigned"}</strong><span>{event.driver_name ?? "Unknown driver"}</span><span>{event.event_name}</span><b>{event.sessions.length}</b></Link>)}</div> : <Empty text="No rental events match the selected filters." />}</ReportSection>}

    {tab === "consumables" && <ReportSection eyebrow="WEAR" title="Tire and pad life" note="Calculated sessions come from events assigned to each set. Known total includes the entered starting count."><h3>Tires</h3><ConsumableTable rows={consumableUsage.tires.map((item) => ({ id: item.id, code: item.business_id, description: [item.manufacturer, item.model, item.size].filter(Boolean).join(" "), vehicle: item.vehicles?.name ?? "—", status: item.status, calculated: item.calculated, total: item.total }))} /><h3 className="report-subhead">Pads</h3><ConsumableTable rows={consumableUsage.pads.map((item) => ({ id: item.id, code: item.business_id, description: [item.manufacturer, item.model, item.compound].filter(Boolean).join(" "), vehicle: `${item.vehicles?.name ?? "—"} · ${item.axle}`, status: item.status, calculated: item.calculated, total: item.total }))} /></ReportSection>}

    {tab === "quality" && <ReportSection eyebrow="RECONCILIATION" title="Missing data" note="This queue uses production records to expose errors and intentionally incomplete history. Correct the source, confirm the record, or document that the value is unavailable."><div className="quality-status-tabs"><button className={qualityStatus === "open" ? "active" : ""} onClick={() => setQualityStatus("open")}>Open <span>{openIssueCount}</span></button><button className={qualityStatus === "resolved" ? "active" : ""} onClick={() => setQualityStatus("resolved")}>Resolved <span>{reviews.length}</span></button></div><div className="quality-toolbar"><label>Issue type<select value={qualityFilter} onChange={(e) => setQualityFilter(e.target.value)}><option value="all">All issues</option>{issueTypes.map((name) => <option key={name}>{name}</option>)}</select></label><span>Showing <strong>{visibleIssues.length}</strong> records</span></div><div className="quality-list">{visibleIssues.map((issue) => { const review = reviewMap.get(issue.key); return <div className="quality-card" key={issue.key}><div><span className="quality-type">{issue.level}</span><strong>{issue.title}</strong><p>{issue.detail}</p><small>{issue.event.business_id} · {displayDate(issue.event.event_date)} · {issue.event.vehicles?.name ?? "Unassigned"}{issue.session ? ` · Session ${issue.session.session_number}` : ""}{review ? ` · ${review.resolution.replace("_", " ")}` : ""}</small></div><div className="quality-actions"><Link className="button ghost small" href={issue.session ? `/dashboard/events/${issue.event.id}/sessions/${issue.session.id}/edit` : `/dashboard/events/${issue.event.id}/edit`}>Fix record</Link>{review ? <form action={reopenAction}><input type="hidden" name="issue_key" value={issue.key} /><button className="text-button" type="submit">Reopen</button></form> : <><QualityDecision action={resolveAction} issue={issue} resolution="confirmed" label="Confirm" /><QualityDecision action={resolveAction} issue={issue} resolution="intentionally_missing" label="Unavailable" /></>}</div></div>; })}</div>{!visibleIssues.length && <Empty text={qualityStatus === "open" ? "No open records match this issue filter." : "No resolved records match this issue filter."} />}</ReportSection>}
  </>;
}

function ReportSection({ eyebrow, title, note, children }: { eyebrow: string; title: string; note: string; children: React.ReactNode }) { return <section className="section-block report-section"><div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{note}</p></div></div>{children}</section>; }
function Empty({ text }: { text: string }) { return <div className="empty-state compact"><strong>No reportable records.</strong><p>{text}</p></div>; }
function ConsumableTable({ rows }: { rows: { id: string; code: string; description: string; vehicle: string; status: string; calculated: number; total: number | null }[] }) { return <div className="report-table consumable-report-table"><div className="report-table-head"><span>Description</span><span>Vehicle / axle</span><span>Status</span><span>Calculated</span><span>Known total</span></div>{rows.map((row) => <div className={`report-table-row ${row.status !== "active" ? "retired" : ""}`} key={row.id}><div><strong>{row.description}</strong><span>{row.code}</span></div><span>{row.vehicle}</span><span>{row.status}</span><b>{row.calculated}</b><b>{row.total ?? "Unknown"}</b></div>)}</div>; }
function QualityDecision({ action, issue, resolution, label }: { action: (formData: FormData) => Promise<void>; issue: QualityIssue; resolution: "confirmed" | "intentionally_missing"; label: string }) { return <form action={action}><input type="hidden" name="issue_key" value={issue.key} /><input type="hidden" name="issue_type" value={issue.title} /><input type="hidden" name="entity_type" value={issue.session ? "session" : "event"} /><input type="hidden" name="entity_id" value={issue.session?.id ?? issue.event.id} /><input type="hidden" name="resolution" value={resolution} /><button className="text-button" type="submit">{label}</button></form>; }
