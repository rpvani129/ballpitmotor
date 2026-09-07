import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditEventForm from "./EditEventForm";

export default async function EditEventPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data: event }, { data: vehicles }, { data: tracks }, { data: tires }, { data: pads }, { data: eventTypes }, { data: teams }] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).single(),
    supabase.from("vehicles").select("id,name,business_id,status").order("name"),
    supabase.from("tracks").select("id,name,short_name,is_active,track_configurations(id,name,is_active)").order("name"),
    supabase.from("tire_sets").select("id,business_id,vehicle_id,status,manufacturer,model,size,compound").order("business_id"),
    supabase.from("pad_sets").select("id,business_id,vehicle_id,axle,status,manufacturer,model,compound").order("business_id"),
    supabase.from("event_types").select("id,name").order("name"),
    supabase.from("teams").select("id,name").order("name"),
  ]);
  if (!event) notFound();
  return (
    <main className="dashboard-main">
      <Link className="back-link" href={`/dashboard/events/${id}`}>← Back to event</Link>
      <section className="page-title"><p className="eyebrow">{event.business_id}</p><h1>Edit event</h1><p>Update the event record and reassign the tires or brake pads used for the day.</p></section>
      {query.error && <p className="alert">The event could not be saved. Review the required fields and consumable assignments.</p>}
      <EditEventForm event={event} vehicles={vehicles ?? []} tracks={tracks ?? []} tires={tires ?? []} pads={pads ?? []} eventTypes={eventTypes ?? []} teams={teams ?? []} />
    </main>
  );
}
