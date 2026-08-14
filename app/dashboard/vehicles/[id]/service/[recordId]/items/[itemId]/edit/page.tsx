import Link from "next/link";
import { notFound } from "next/navigation";
import { updateMaintenanceRecordItem } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import ServiceItemForm from "../../../../items/ServiceItemForm";

export default async function EditServiceItemPage({ params, searchParams }: { params: Promise<{ id: string; recordId: string; itemId: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id, recordId, itemId } = await params; const query = await searchParams; const supabase = await createClient();
  const [{ data: vehicle }, { data: record }, { data: item }] = await Promise.all([supabase.from("vehicles").select("id,business_id,name").eq("id", id).single(), supabase.from("maintenance_records").select("id,title").eq("vehicle_id", id).eq("id", recordId).single(), supabase.from("maintenance_record_items").select("id,category,title,details,quantity,line_amount,source_item_number,status").eq("maintenance_record_id", recordId).eq("id", itemId).single()]);
  if (!vehicle || !record || !item) notFound();
  return <main className="dashboard-main"><Link className="back-link" href={`/dashboard/vehicles/${id}`}>← Back to vehicle</Link><section className="page-title compact-title"><p className="eyebrow">{vehicle.business_id}</p><h1>Edit service item</h1><p>{record.title} · {vehicle.name}</p></section>{query.error && <p className="alert">The service item could not be saved.</p>}<ServiceItemForm vehicleId={id} recordId={recordId} item={item} action={updateMaintenanceRecordItem} /></main>;
}
