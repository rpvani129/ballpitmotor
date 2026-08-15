import Link from "next/link";
import { deleteVehicle } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import DeleteRecordButton from "../DeleteRecordButton";

export default async function VehiclesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data: vehicles }, { data: maintenance }] = await Promise.all([
    supabase.from("vehicles").select("id,business_id,name,status").order("name"),
    supabase.from("maintenance_records").select("id,vehicle_id,maintenance_record_items(id)"),
  ]);
  const maintenanceFor = (vehicleId: string) => {
    const records = (maintenance ?? []).filter((record) => record.vehicle_id === vehicleId);
    return { records: records.length, items: records.reduce((sum, record) => sum + (record.maintenance_record_items?.length ?? 0), 0) };
  };
  return (
    <main className="dashboard-main">
      <section className="page-title action-title"><div><p className="eyebrow">THE BALLS</p><h1>Vehicles</h1><p>Every event, session and checklist starts with the car.</p></div><Link className="button primary" href="/dashboard/vehicles/new">+ Add vehicle</Link></section>
      {query.error && <p className="alert">{query.error === "vehicle_in_use" ? "This vehicle is assigned to an event and cannot be deleted." : "The vehicle could not be deleted."}</p>}{query.deleted && <p className="success-message">Vehicle deleted.</p>}
      <div>
        <section className="section-block">
          <div className="vehicle-grid">
            {(vehicles ?? []).map((vehicle) => { const counts = maintenanceFor(vehicle.id); return (
              <article className="vehicle-card" key={vehicle.id}><Link className="vehicle-card-main" href={`/dashboard/vehicles/${vehicle.id}`}><span className="ball-number">{vehicle.business_id}</span><div><h2>{vehicle.name}</h2><p>{vehicle.status} · View garage file →</p></div></Link><div className="record-actions"><Link className="button ghost compact-button" href={`/dashboard/vehicles/${vehicle.id}/edit`}>Edit</Link><DeleteRecordButton action={deleteVehicle} fields={{ vehicle_id: vehicle.id }} confirmMessage={`Delete ${vehicle.name}?${counts.records ? ` This will also delete ${counts.records} maintenance record${counts.records === 1 ? "" : "s"} and ${counts.items} detailed maintenance item${counts.items === 1 ? "" : "s"}.` : ""} Its tires and pads will also be deleted. Vehicles assigned to events cannot be deleted.`} /></div></article>
            ); })}
          </div>
        </section>
      </div>
    </main>
  );
}
