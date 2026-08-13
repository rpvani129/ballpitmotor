import Link from "next/link";
import { notFound } from "next/navigation";
import { updateEventNote } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import NoteForm from "../../NoteForm";
import DeleteNoteButton from "../../DeleteNoteButton";

export default async function EditEventNotePage({ params, searchParams }: { params: Promise<{ id: string; noteId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id, noteId } = await params; const query = await searchParams; const supabase = await createClient();
  const [{ data: event }, { data: note }, { data: categories }] = await Promise.all([supabase.from("events").select("id,business_id,event_name").eq("id", id).single(), supabase.from("event_notes").select("id,category,body").eq("event_id", id).eq("id", noteId).single(), supabase.from("event_note_categories").select("name").order("name")]);
  if (!event || !note) notFound();
  return <main className="dashboard-main"><Link className="back-link" href={`/dashboard/events/${id}?tab=notes`}>← Back to event</Link><section className="page-title compact-title"><p className="eyebrow">{event.business_id}</p><h1>Edit note</h1><p>{event.event_name}</p></section>{query.error && <p className="alert">The note could not be {query.error === "delete" ? "deleted" : "saved"}.</p>}<NoteForm eventId={id} categories={(categories ?? []).map((category) => category.name)} note={note} action={updateEventNote} /><section className="danger-zone"><div><p className="eyebrow">REMOVE NOTE</p><h2>Delete this journal entry</h2><p>This permanently removes this note from the event history.</p></div><DeleteNoteButton eventId={id} noteId={noteId} /></section></main>;
}
