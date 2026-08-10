"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatLap } from "@/lib/grid";

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

type SortMode = "date-desc" | "date-asc" | "lap-asc" | "lap-desc" | "name-asc";

const fastestLap = (event: EventRow) => {
  const laps = event.sessions.map((session) => session.best_lap_ms).filter((lap): lap is number => lap != null);
  return laps.length ? Math.min(...laps) : null;
};

export default function EventIndex({ events }: { events: EventRow[] }) {
  const [search, setSearch] = useState("");
  const [track, setTrack] = useState("");
  const [configuration, setConfiguration] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [sort, setSort] = useState<SortMode>("date-desc");

  const tracks = useMemo(() => [...new Set(events.map((event) => event.track_name))].sort(), [events]);
  const configurations = useMemo(() => [...new Set(events.filter((event) => !track || event.track_name === track).map((event) => event.configuration_name))].sort(), [events, track]);
  const vehicles = useMemo(() => [...new Set(events.map((event) => event.vehicles?.name).filter((name): name is string => Boolean(name)))].sort(), [events]);

  const visibleEvents = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return events.filter((event) =>
      (!track || event.track_name === track) &&
      (!configuration || event.configuration_name === configuration) &&
      (!vehicle || event.vehicles?.name === vehicle) &&
      (!needle || [event.business_id, event.event_name, event.organization_name, event.track_name, event.configuration_name, event.vehicles?.name].some((value) => value?.toLowerCase().includes(needle)))
    ).sort((a, b) => {
      if (sort === "date-asc") return a.event_date.localeCompare(b.event_date) || a.business_id.localeCompare(b.business_id);
      if (sort === "date-desc") return b.event_date.localeCompare(a.event_date) || b.business_id.localeCompare(a.business_id);
      if (sort === "name-asc") return a.event_name.localeCompare(b.event_name);
      const aLap = fastestLap(a);
      const bLap = fastestLap(b);
      if (aLap == null && bLap == null) return 0;
      if (aLap == null) return 1;
      if (bLap == null) return -1;
      return sort === "lap-asc" ? aLap - bLap : bLap - aLap;
    });
  }, [events, search, track, configuration, vehicle, sort]);

  const reset = () => { setSearch(""); setTrack(""); setConfiguration(""); setVehicle(""); setSort("date-desc"); };

  return (
    <div className="event-index">
      <div className="event-filters">
        <label className="filter-search">Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Event, ID or organization" /></label>
        <label>Track<select value={track} onChange={(event) => { setTrack(event.target.value); setConfiguration(""); }}><option value="">All tracks</option>{tracks.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Configuration<select value={configuration} onChange={(event) => setConfiguration(event.target.value)}><option value="">All configurations</option>{configurations.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Vehicle<select value={vehicle} onChange={(event) => setVehicle(event.target.value)}><option value="">All vehicles</option>{vehicles.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Sort<select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="date-desc">Newest date</option><option value="date-asc">Oldest date</option><option value="lap-asc">Fastest lap: low to high</option><option value="lap-desc">Fastest lap: high to low</option><option value="name-asc">Event name</option></select></label>
        <button className="text-button event-filter-reset" type="button" onClick={reset}>Reset</button>
      </div>
      <p className="event-result-count">Showing <strong>{visibleEvents.length}</strong> of {events.length} events</p>
      <div className="event-table" role="table" aria-label="Events">
        <div className="event-table-head" role="row"><span>Date</span><span>Event</span><span>Vehicle</span><span>Track + configuration</span><span>Fastest lap</span><span>Sessions</span></div>
        {visibleEvents.map((event) => {
          const bestLap = fastestLap(event);
          return <Link className="event-table-row" role="row" href={`/dashboard/events/${event.id}`} key={event.id}>
            <time>{new Date(`${event.event_date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</time>
            <div><strong>{event.event_name}</strong><span>{event.business_id} · {event.organization_name || "Independent"}</span></div>
            <span>{event.vehicles?.name ?? "—"}</span>
            <div><strong>{event.track_name}</strong><span>{event.configuration_name}</span></div>
            <b className={bestLap != null ? "lap-value" : "lap-value empty"}>{formatLap(bestLap)}</b>
            <span>{event.sessions.length}</span>
          </Link>;
        })}
      </div>
      {!visibleEvents.length && <div className="empty-state compact"><strong>No matching events.</strong><p>Change a filter or reset the event index.</p></div>}
    </div>
  );
}
