import Link from "next/link";
import { notFound } from "next/navigation";
import { addMaintenanceRecord } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import ServiceRecordForm from "../ServiceRecordForm";

export default async function NewServiceRecordPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) { const { id } = await params; const query = await searchParams; const supabase = await createClient(); const { data: vehicle } = await supabase.from("vehicles").select("id,business_id,name").eq("id", id).single(); if (!vehicle) notFound(); return <main className="dashboard-main"><Link className="back-link" href={`/dashboard/vehicles/${id}`}>← Back to vehicle</Link><section className="page-title compact-title"><p className="eyebrow">{vehicle.business_id}</p><h1>Add service</h1><p>Log maintenance, repairs, inspections, upgrades, or setup work for {vehicle.name}.</p></section>{query.error && <p className="alert">The service record could not be saved.</p>}<ServiceRecordForm vehicleId={id} action={addMaintenanceRecord} /></main>; }
