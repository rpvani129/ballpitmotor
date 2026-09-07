"use client";

import Link from "next/link";
import { useState } from "react";
import { formatLap } from "@/lib/grid";

type Session = {
  id: string;
  session_number: number;
  started_at: string | null;
  best_lap_ms: number | null;
  source_url: string | null;
  notes: string | null;
};

export default function SessionForm({ eventId, session, defaultSessionNumber = 1, action }: { eventId: string; session?: Session; defaultSessionNumber?: number; action: (formData: FormData) => void | Promise<void> }) {
  const [sessionCount, setSessionCount] = useState(1);
  const isBulk = !session && sessionCount > 1;
  return <form className="event-form record-form" action={action}>
    <input type="hidden" name="event_id" value={eventId} />
    {session && <input type="hidden" name="session_id" value={session.id} />}
    <section className="form-section">
      <div className="form-section-number">01</div>
      <div className="form-section-copy"><p className="eyebrow">SESSION DATA</p><h2>{session ? "Edit session" : "Add session"}</h2></div>
      <div className="form-grid">
        <label>{session ? "Session" : "First session number"}<input name="session_number" type="number" min="1" defaultValue={session?.session_number ?? defaultSessionNumber} required /></label>
        {!session && <label>Sessions to add<input name="session_count" type="number" min="1" max="20" value={sessionCount} onChange={(event) => setSessionCount(Number(event.target.value))} required /></label>}
        <label>Start time<input name="started_at" type="time" disabled={isBulk} defaultValue={session?.started_at?.slice(0, 5) ?? ""} /></label>
        <label>Best lap <small>(optional)</small><input name="best_lap" disabled={isBulk} defaultValue={session?.best_lap_ms ? formatLap(session.best_lap_ms) : ""} placeholder="1:23.49" pattern="[0-9]+:[0-5]?[0-9](\.[0-9]{1,3})?" /></label>
        <label>Source URL<input name="source_url" type="url" disabled={isBulk} defaultValue={session?.source_url ?? ""} placeholder="Garmin screenshot or source" /></label>
        <label className="span-2">Notes<textarea name="notes" rows={5} defaultValue={session?.notes ?? ""} /></label>
        {!session && <p className="form-field-note span-2">For bulk usage entries, start time, best lap and source URL are left blank. Notes are copied to every session.</p>}
      </div>
    </section>
    <div className="form-submit"><Link className="button ghost light" href={`/dashboard/events/${eventId}?tab=sessions`}>Cancel</Link><button className="button primary large">{session ? "Save session" : `Add ${sessionCount} session${sessionCount === 1 ? "" : "s"}`}</button></div>
  </form>;
}
