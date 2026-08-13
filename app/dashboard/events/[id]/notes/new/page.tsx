import Link from "next/link";
import { notFound } from "next/navigation";
import { addEventNote } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import NoteForm from "../NoteForm";

export default async function NewEventNotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params; const query = await searchParams; const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("id,business_id,event_name").eq("id", id).single();
  if (!event) notFound();
  return <main className="dashboard-main"><Link className="back-link" href={`/dashboard/events/${id}?tab=notes`}>← Back to event</Link><section className="page-title compact-title"><p className="eyebrow">{event.business_id}</p><h1>Add note</h1><p>{event.event_name}</p></section>{query.error && <p className="alert">The note could not be saved. Enter a note of 5,000 characters or fewer.</p>}<NoteForm eventId={id} action={addEventNote} /></main>;
}
