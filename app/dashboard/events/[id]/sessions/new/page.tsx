import Link from "next/link";
import { notFound } from "next/navigation";
import { addSession } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import SessionForm from "../SessionForm";

export default async function NewSessionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data: event }, { data: sessions }] = await Promise.all([
    supabase.from("events").select("id,business_id,event_name").eq("id", id).single(),
    supabase.from("sessions").select("session_number").eq("event_id", id),
  ]);
  if (!event) notFound();
  const nextSession = sessions?.length ? Math.max(...sessions.map((session) => session.session_number)) + 1 : 1;
  return <main className="dashboard-main">
    <Link className="back-link" href={`/dashboard/events/${id}?tab=sessions`}>← Back to event</Link>
    <section className="page-title compact-title"><p className="eyebrow">{event.business_id}</p><h1>Add session</h1><p>{event.event_name}</p></section>
    {query.error && <p className="alert">The session could not be saved. Check the lap-time format and required fields.</p>}
    <SessionForm eventId={id} action={addSession} defaultSessionNumber={nextSession} />
  </main>;
}
