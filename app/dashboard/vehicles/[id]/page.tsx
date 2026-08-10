import Link from "next/link";
import { notFound } from "next/navigation";
import { addMaintenanceRecord, updateVehicle } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import ServiceRecords from "./ServiceRecords";

export default async function VehiclePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data: vehicle }, { data: maintenance }, { count: eventCount }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("id", id).single(),
    supabase.from("maintenance_records").select("*, maintenance_record_items(*)").eq("vehicle_id", id).order("service_date", { ascending: false }).order("position", { referencedTable: "maintenance_record_items", ascending: true }),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("vehicle_id", id),
  ]);
  if (!vehicle) notFound();
  return <main className="dashboard-main">
    <Link className="back-link" href="/dashboard/vehicles">← Vehicles</Link>
    <section className="vehicle-detail-hero"><div><p className="eyebrow">{vehicle.business_id} · GARAGE FILE</p><h1>{vehicle.name}</h1><p>{[vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ") || "Vehicle details ready to complete."}</p></div><div className="vehicle-count"><strong>{eventCount ?? 0}</strong><span>Events</span></div></section>
    {query.error && <p className="alert">That update could not be saved. Check the fields and try again.</p>}
    <div className="vehicle-detail-grid">
      <section className="form-card"><p className="eyebrow">VEHICLE PROFILE</p><h2>Details</h2>
        <form className="form-grid" action={updateVehicle}><input type="hidden" name="vehicle_id" value={id} />
          <label>Vehicle name<input name="name" defaultValue={vehicle.name} required /></label><label>Status<select name="status" defaultValue={vehicle.status}><option>active</option><option>retired</option><option>sold</option></select></label>
          <label>Year<input name="year" type="number" defaultValue={vehicle.year ?? ""} /></label><label>Make<input name="make" defaultValue={vehicle.make ?? ""} /></label>
          <label>Model<input name="model" defaultValue={vehicle.model ?? ""} /></label><label>Trim / generation<input name="trim" defaultValue={vehicle.trim ?? ""} /></label>
          <label>Race number<input name="race_number" defaultValue={vehicle.race_number ?? ""} /></label><label>Competition class<input name="competition_class" defaultValue={vehicle.competition_class ?? ""} /></label>
          <label>Current mileage<input name="current_odometer_miles" type="number" min="0" defaultValue={vehicle.current_odometer_miles ?? ""} /></label><label>Acquired<input name="acquired_on" type="date" defaultValue={vehicle.acquired_on ?? ""} /></label>
          <label className="span-2">Ball Wiki URL<input name="wiki_url" type="url" defaultValue={vehicle.wiki_url ?? ""} /></label><label className="span-2">Image URL<input name="image_url" type="url" defaultValue={vehicle.image_url ?? ""} /></label>
          <label className="span-2">Description<textarea name="description" rows={4} defaultValue={vehicle.description ?? ""} /></label><button className="button primary span-2">Save vehicle</button>
        </form>
      </section>
      <aside className="form-card"><p className="eyebrow">SERVICE LOG</p><h2>Add maintenance</h2>
        <form className="stack-form" action={addMaintenanceRecord}><input type="hidden" name="vehicle_id" value={id} />
          <label>Date<input name="service_date" type="date" required /></label><label>Category<select name="category"><option>Maintenance</option><option>Repair</option><option>Inspection</option><option>Upgrade</option><option>Setup</option></select></label>
          <label>Title<input name="title" placeholder="Oil and filter change" required /></label><label>Mileage<input name="odometer_miles" type="number" min="0" /></label>
          <label>Vendor<input name="vendor" /></label><label>Cost<input name="cost" type="number" min="0" step="0.01" /></label>
          <label>Next due date<input name="next_due_date" type="date" /></label><label>Next due mileage<input name="next_due_miles" type="number" min="0" /></label>
          <label>Receipt / source URL<input name="source_url" type="url" /></label><label>Notes<textarea name="description" rows={3} /></label><button className="button dark">Add service record</button>
        </form>
      </aside>
    </div>
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">MAINTENANCE HISTORY</p><h2>Service records</h2></div><span>{maintenance?.length ?? 0} logged</span></div>
      {maintenance?.length ? <ServiceRecords vehicleId={id} records={maintenance} /> : <div className="empty-state"><strong>No maintenance logged.</strong><p>Add the first service item above.</p></div>}
    </section>
  </main>;
}
