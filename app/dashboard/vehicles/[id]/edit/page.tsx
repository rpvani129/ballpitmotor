import Link from "next/link";
import { notFound } from "next/navigation";
import { updateVehicle } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import VehicleForm from "../../VehicleForm";

export default async function EditVehiclePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params; const query = await searchParams; const supabase = await createClient();
  const { data: vehicle } = await supabase.from("vehicles").select("*").eq("id", id).single();
  if (!vehicle) notFound();
  return <main className="dashboard-main"><Link className="back-link" href={`/dashboard/vehicles/${id}`}>← Back to vehicle</Link><section className="page-title compact-title"><p className="eyebrow">{vehicle.business_id}</p><h1>Edit vehicle</h1><p>Update the garage file for {vehicle.name}.</p></section>{query.error && <p className="alert">The vehicle could not be saved.</p>}<VehicleForm vehicle={vehicle} action={updateVehicle} /></main>;
}
