import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteSession, updateSession } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import DeleteRecordButton from "../../../../../DeleteRecordButton";
import SessionForm from "../../SessionForm";

export default async function EditSessionPage({ params, searchParams }: { params: Promise<{ id: string; sessionId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id, sessionId } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data: event }, { data: session }] = await Promise.all([
    supabase.from("events").select("id,business_id,event_name").eq("id", id).single(),
    supabase.from("sessions").select("id,session_number,started_at,best_lap_ms,source_url,notes").eq("event_id", id).eq("id", sessionId).single(),
  ]);
  if (!event || !session) notFound();
  return <main className="dashboard-main">
    <Link className="back-link" href={`/dashboard/events/${id}?tab=sessions`}>← Back to event</Link>
    <section className="page-title compact-title"><p className="eyebrow">{event.business_id}</p><h1>Edit session</h1><p>{event.event_name} · Session {session.session_number}</p></section>
    {query.error && <p className="alert">The session could not be saved. Check the lap-time format and required fields.</p>}
    <SessionForm eventId={id} session={session} action={updateSession} />
    <section className="danger-zone"><div><p className="eyebrow">REMOVE SESSION</p><h2>Delete this session</h2><p>This permanently removes the session and its lap-time record.</p></div><DeleteRecordButton action={deleteSession} fields={{ event_id: id, session_id: sessionId }} label="Delete session" confirmMessage={`Delete session ${session.session_number}?`} /></section>
  </main>;
}
