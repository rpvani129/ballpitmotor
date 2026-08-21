"use client";

import { useState } from "react";
import Link from "next/link";
import { commitGarminSessionImport } from "@/app/actions";
import type { ExtractedGarminSession } from "@/lib/garmin-session-extraction";

type ReviewSession = ExtractedGarminSession & { session_number: number; source_storage_path: string };
const blank = (number: number): ReviewSession => ({ session_number: number, started_at: null, best_lap: null, source_file_name: "", source_storage_path: "", notes: null, confidence: 1, warnings: [] });

export default function GarminImportReview({ eventId, importId, warnings, initial }: { eventId: string; importId: string; warnings: string[]; initial: ReviewSession[] }) {
  const [sessions, setSessions] = useState(initial);
  const update = (index: number, field: keyof ReviewSession, value: unknown) => setSessions((current) => current.map((session, position) => position === index ? { ...session, [field]: value } : session));
  return <form action={commitGarminSessionImport} className="import-review-form"><input type="hidden" name="event_id" value={eventId} /><input type="hidden" name="import_id" value={importId} /><input type="hidden" name="draft" value={JSON.stringify({ sessions })} />
    {warnings.length > 0 && <div className="import-warnings"><strong>Screenshot notes</strong>{warnings.map((warning, index) => <p key={index}>{warning}</p>)}</div>}
    <div className="import-record-summary"><strong>{sessions.length} session{sessions.length === 1 ? "" : "s"} found</strong><span>Confirm each row before adding it to the event.</span></div>
    <div className="garmin-review-list">{sessions.map((session, index) => <article className="import-item-card" key={index}><div className="import-item-title"><strong>Session {index + 1}</strong><button type="button" className="text-button danger-text" onClick={() => setSessions((current) => current.filter((_, position) => position !== index))}>Remove</button></div>
      {session.warnings.length > 0 && <div className="import-warnings compact">{session.warnings.map((warning, warningIndex) => <p key={warningIndex}>{warning}</p>)}</div>}
      <div className="form-grid"><label>Session number <span className="required-mark">*</span><input type="number" min="1" value={session.session_number} onChange={(event) => update(index, "session_number", Number(event.target.value))} required /></label><label>Start time<input type="time" value={session.started_at ?? ""} onChange={(event) => update(index, "started_at", event.target.value || null)} /></label><label>Best lap<input value={session.best_lap ?? ""} placeholder="1:23.49" pattern="[0-9]+:[0-5]?[0-9](\.[0-9]{1,3})?" onChange={(event) => update(index, "best_lap", event.target.value || null)} /></label><label>Source image<input value={session.source_file_name} readOnly /></label><label className="span-2">Notes<textarea value={session.notes ?? ""} onChange={(event) => update(index, "notes", event.target.value || null)} /></label></div>
    </article>)}</div>
    <button type="button" className="button outline" onClick={() => setSessions((current) => [...current, blank(Math.max(0, ...current.map((session) => session.session_number)) + 1)])}>+ Add session</button>
    <div className="form-submit"><Link className="button ghost light" href={`/dashboard/events/${eventId}?tab=sessions`}>Cancel</Link><button className="button primary large" disabled={!sessions.length}>Confirm and add {sessions.length} session{sessions.length === 1 ? "" : "s"}</button></div>
  </form>;
}
