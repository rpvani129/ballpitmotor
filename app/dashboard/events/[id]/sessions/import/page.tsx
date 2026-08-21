import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GarminSessionUpload from "./GarminSessionUpload";

export default async function GarminImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("id,workspace_id,business_id,event_name,track_name,configuration_name").eq("id", id).single();
  if (!event) notFound();
  return <main className="dashboard-main"><Link className="back-link" href={`/dashboard/events/${id}?tab=sessions`}>← Back to event</Link><section className="page-title compact-title"><p className="eyebrow">{event.business_id} · GARMIN IMPORT</p><h1>Upload sessions</h1><p>{event.event_name} · {event.track_name} · {event.configuration_name}</p></section><GarminSessionUpload workspaceId={event.workspace_id} eventId={id} /></main>;
}
