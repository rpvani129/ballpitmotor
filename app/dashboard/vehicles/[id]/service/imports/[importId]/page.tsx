import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ExtractedServiceRecord } from "@/lib/service-record-extraction";
import ImportReviewForm from "./ImportReviewForm";

export default async function ServiceImportReviewPage({ params, searchParams }: { params: Promise<{ id: string; importId: string }>; searchParams: Promise<Record<string,string>> }) {
  const { id, importId } = await params; const query = await searchParams; const supabase = await createClient();
  const [{ data: vehicle }, { data: imported }] = await Promise.all([supabase.from("vehicles").select("id,business_id,name").eq("id", id).single(), supabase.from("service_record_imports").select("*").eq("vehicle_id", id).eq("id", importId).single()]);
  if (!vehicle || !imported) notFound();
  return <main className="dashboard-main"><Link className="back-link" href={`/dashboard/vehicles/${id}`}>← Back to vehicle</Link><section className="page-title compact-title"><p className="eyebrow">{vehicle.business_id} · IMPORT REVIEW</p><h1>Check before saving</h1><p>{imported.file_name} · Nothing has been added to {vehicle.name} yet.</p></section>
    {query.error && <p className="alert">The import could not be saved. Check the required fields and try again.</p>}
    {imported.status === "failed" ? <div className="empty-state"><strong>The document could not be read.</strong><p>{imported.extraction_error || "Try a clearer scan or enter the record manually."}</p><Link className="button primary" href={`/dashboard/vehicles/${id}/service/upload`}>Try another file</Link></div> : imported.status === "committed" ? <div className="success-message">This import has already been added to service history.</div> : imported.status === "review" && imported.extracted_data ? <ImportReviewForm vehicleId={id} importId={importId} initial={imported.extracted_data as ExtractedServiceRecord} /> : <div className="empty-state"><strong>Still processing.</strong><p>Refresh this page in a moment.</p></div>}
  </main>;
}
