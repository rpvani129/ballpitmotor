import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ExtractedGarminImport, ExtractedGarminSession } from "@/lib/garmin-session-extraction";
import GarminImportReview from "./GarminImportReview";

type StoredFile = { storagePath: string; fileName: string };

export default async function GarminImportReviewPage({ params, searchParams }: { params: Promise<{ id: string; importId: string }>; searchParams: Promise<Record<string,string>> }) {
  const { id, importId } = await params; const query = await searchParams; const supabase = await createClient();
  const [{ data: event }, { data: imported }, { data: existing }] = await Promise.all([
    supabase.from("events").select("id,business_id,event_name").eq("id", id).single(),
    supabase.from("session_imports").select("*").eq("event_id", id).eq("id", importId).single(),
    supabase.from("sessions").select("session_number").eq("event_id", id),
  ]);
  if (!event || !imported) notFound();
  const extracted = imported.extracted_data as ExtractedGarminImport | null; const files = (imported.files ?? []) as StoredFile[]; const sourceByName = new Map(files.map((file) => [file.fileName, file.storagePath]));
  const nextSession = existing?.length ? Math.max(...existing.map((session) => session.session_number)) + 1 : 1;
  const initial = (extracted?.sessions ?? []).map((session: ExtractedGarminSession, index: number) => ({ ...session, session_number: nextSession + index, source_storage_path: sourceByName.get(session.source_file_name) ?? files[0]?.storagePath ?? "" }));
  return <main className="dashboard-main"><Link className="back-link" href={`/dashboard/events/${id}?tab=sessions`}>← Back to event</Link><section className="page-title compact-title"><p className="eyebrow">{event.business_id} · GARMIN REVIEW</p><h1>Check before saving</h1><p>{files.length} screenshot{files.length === 1 ? "" : "s"} · Nothing has been added to {event.event_name} yet.</p></section>
    {query.duplicate && <p className="alert">This exact screenshot set was already uploaded. The original import is shown below.</p>}{query.error && <p className="alert">The sessions could not be saved. Check session numbers, times, and lap formats.</p>}
    {imported.status === "failed" ? <div className="empty-state"><strong>The screenshots could not be read.</strong><p>{imported.extraction_error || "Try clearer screenshots or enter sessions manually."}</p><Link className="button primary" href={`/dashboard/events/${id}/sessions/import`}>Try another upload</Link></div> : imported.status === "committed" ? <div className="success-message">This screenshot import has already been added to the event.</div> : imported.status === "review" && extracted ? <GarminImportReview eventId={id} importId={importId} warnings={extracted.warnings ?? []} initial={initial} /> : <div className="empty-state"><strong>Still processing.</strong><p>Refresh this page in a moment.</p></div>}
  </main>;
}
