import Link from "next/link";
import { notFound } from "next/navigation";
import { updateMaintenanceRecord } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import ServiceRecordForm from "../../ServiceRecordForm";

export default async function EditServiceRecordPage({ params, searchParams }: { params: Promise<{ id: string; recordId: string }>; searchParams: Promise<Record<string, string>> }) { const { id, recordId } = await params; const query = await searchParams; const supabase = await createClient(); const [{ data: vehicle }, { data: record }] = await Promise.all([supabase.from("vehicles").select("id,business_id,name").eq("id", id).single(), supabase.from("maintenance_records").select("*").eq("vehicle_id", id).eq("id", recordId).single()]); if (!vehicle || !record) notFound(); return <main className="dashboard-main"><Link className="back-link" href={`/dashboard/vehicles/${id}`}>← Back to vehicle</Link><section className="page-title compact-title"><p className="eyebrow">{vehicle.business_id}</p><h1>Edit service</h1><p>{record.title} · {vehicle.name}</p></section>{query.error && <p className="alert">The service record could not be saved.</p>}<ServiceRecordForm vehicleId={id} record={record} action={updateMaintenanceRecord} /></main>; }
