import Link from "next/link";

type EventNote = { id: string; category: string; body: string };

export default function NoteForm({ eventId, note, action }: { eventId: string; note?: EventNote; action: (formData: FormData) => void | Promise<void> }) {
  return <form className="event-form record-form" action={action}>
    <input type="hidden" name="event_id" value={eventId} />
    {note && <input type="hidden" name="note_id" value={note.id} />}
    <section className="form-section">
      <div className="form-section-number">01</div>
      <div className="form-section-copy"><p className="eyebrow">EVENT JOURNAL</p><h2>{note ? "Edit note" : "Add note"}</h2></div>
      <div className="form-grid">
        <label>Category<select name="category" defaultValue={note?.category ?? "General"}><option>General</option><option>Plan</option><option>Setup</option><option>Driver Feedback</option><option>Incident</option><option>Follow-up</option></select></label>
        <label className="span-2">Note<textarea name="body" rows={10} maxLength={5000} defaultValue={note?.body ?? ""} placeholder="Add plans, setup decisions, observations, incidents, results, or follow-up." required /></label>
      </div>
    </section>
    <div className="form-submit"><Link className="button ghost light" href={`/dashboard/events/${eventId}?tab=notes`}>Cancel</Link><button className="button primary large">{note ? "Save note" : "Add note"}</button></div>
  </form>;
}
