"use client";

import { useMemo, useRef, useState } from "react";

type ShareEvent = { business_id: string; event_date: string; event_name: string; track_name: string; configuration_name: string };

export default function EventShareDialog({ workspaceSlug, publicEnabled, events }: { workspaceSlug: string; publicEnabled: boolean; events: ShareEvent[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState("");
  const publicPath = `/events/${workspaceSlug}`;
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return needle ? events.filter((event) => [event.business_id, event.event_name, event.track_name, event.configuration_name, event.event_date].join(" ").toLowerCase().includes(needle)) : events;
  }, [events, search]);

  const copy = async (path: string) => {
    const url = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    setCopied(path);
    window.setTimeout(() => setCopied((current) => current === path ? "" : current), 1600);
  };

  return <>
    <button className="button ghost" type="button" onClick={() => dialog.current?.showModal()}>Share</button>
    <dialog className="share-dialog" ref={dialog} onClick={(event) => { if (event.target === dialog.current) dialog.current?.close(); }}>
      <div className="share-dialog-heading"><div><p className="eyebrow">PUBLIC LINKS</p><h2>Share events</h2></div><button className="dialog-close" type="button" aria-label="Close share links" onClick={() => dialog.current?.close()}>×</button></div>
      {!publicEnabled && <p className="share-warning">Public event pages are currently disabled. Enable them in Event Settings before sharing these links.</p>}
      <div className="share-index-row"><div><strong>All public events</strong><span>{publicPath}</span></div><button className="button dark compact-button" type="button" onClick={() => copy(publicPath)}>{copied === publicPath ? "Copied" : "Copy"}</button></div>
      <label className="share-search">Find an event<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search date, track, or event" /></label>
      <div className="share-event-list">{filtered.map((event) => { const path = `${publicPath}/${event.business_id}`; return <div key={event.business_id}><div><strong>{event.event_name}</strong><span>{new Date(`${event.event_date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {event.track_name} · {event.configuration_name}</span></div><button className="button ghost compact-button" type="button" onClick={() => copy(path)}>{copied === path ? "Copied" : "Copy"}</button></div>; })}{!filtered.length && <p className="share-empty">No matching events.</p>}</div>
    </dialog>
  </>;
}
