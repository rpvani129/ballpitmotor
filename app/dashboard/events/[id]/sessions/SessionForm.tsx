import Link from "next/link";
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
  return <form className="event-form record-form" action={action}>
    <input type="hidden" name="event_id" value={eventId} />
    {session && <input type="hidden" name="session_id" value={session.id} />}
    <section className="form-section">
      <div className="form-section-number">01</div>
      <div className="form-section-copy"><p className="eyebrow">SESSION DATA</p><h2>{session ? "Edit session" : "Add session"}</h2></div>
      <div className="form-grid">
        <label>Session<input name="session_number" type="number" min="1" defaultValue={session?.session_number ?? defaultSessionNumber} required /></label>
        <label>Start time<input name="started_at" type="time" defaultValue={session?.started_at?.slice(0, 5) ?? ""} /></label>
        <label>Best lap <small>(optional)</small><input name="best_lap" defaultValue={session?.best_lap_ms ? formatLap(session.best_lap_ms) : ""} placeholder="1:23.49" pattern="[0-9]+:[0-5]?[0-9](\.[0-9]{1,3})?" /></label>
        <label>Source URL<input name="source_url" type="url" defaultValue={session?.source_url ?? ""} placeholder="Garmin screenshot or source" /></label>
        <label className="span-2">Notes<textarea name="notes" rows={5} defaultValue={session?.notes ?? ""} /></label>
      </div>
    </section>
    <div className="form-submit"><Link className="button ghost light" href={`/dashboard/events/${eventId}?tab=sessions`}>Cancel</Link><button className="button primary large">{session ? "Save session" : "Add session"}</button></div>
  </form>;
}
