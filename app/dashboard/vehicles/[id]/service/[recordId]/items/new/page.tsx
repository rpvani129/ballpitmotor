import Link from "next/link";
import { notFound } from "next/navigation";
import { addMaintenanceRecordItem } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import ServiceItemForm from "../../../items/ServiceItemForm";

export default async function NewServiceItemPage({ params, searchParams }: { params: Promise<{ id: string; recordId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id, recordId } = await params; const query = await searchParams; const supabase = await createClient();
  const [{ data: vehicle }, { data: record }] = await Promise.all([supabase.from("vehicles").select("id,business_id,name").eq("id", id).single(), supabase.from("maintenance_records").select("id,title").eq("vehicle_id", id).eq("id", recordId).single()]);
  if (!vehicle || !record) notFound();
  return <main className="dashboard-main"><Link className="back-link" href={`/dashboard/vehicles/${id}`}>← Back to vehicle</Link><section className="page-title compact-title"><p className="eyebrow">{vehicle.business_id}</p><h1>Add service item</h1><p>{record.title} · {vehicle.name}</p></section>{query.error && <p className="alert">The service item could not be saved.</p>}<ServiceItemForm vehicleId={id} recordId={recordId} action={addMaintenanceRecordItem} /></main>;
}
