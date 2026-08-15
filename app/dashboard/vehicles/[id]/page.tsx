import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteVehicle } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import DeleteRecordButton from "../../DeleteRecordButton";
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
  const maintenanceCount = maintenance?.length ?? 0;
  const maintenanceItemCount = (maintenance ?? []).reduce((sum, record) => sum + (record.maintenance_record_items?.length ?? 0), 0);
  return <main className="dashboard-main">
    <Link className="back-link" href="/dashboard/vehicles">← Vehicles</Link>
    <section className="vehicle-detail-hero"><div><p className="eyebrow">{vehicle.business_id} · GARAGE FILE</p><h1>{vehicle.name}</h1><p>{[vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ") || "Vehicle details ready to complete."}</p></div><div className="vehicle-hero-actions"><div className="record-actions"><Link className="button dark" href={`/dashboard/vehicles/${id}/edit`}>Edit vehicle</Link><DeleteRecordButton action={deleteVehicle} fields={{ vehicle_id: id }} confirmMessage={`Delete ${vehicle.name}?${maintenanceCount ? ` This will also delete ${maintenanceCount} maintenance record${maintenanceCount === 1 ? "" : "s"} and ${maintenanceItemCount} detailed maintenance item${maintenanceItemCount === 1 ? "" : "s"}.` : ""} Its tires and pads will also be deleted. Vehicles assigned to events cannot be deleted.`} /></div><div className="vehicle-count"><strong>{eventCount ?? 0}</strong><span>Events</span></div></div></section>
    {query.error && <p className="alert">That update could not be saved. Check the fields and try again.</p>}{query.deleted && <p className="success-message">Record deleted.</p>}
    <section className="vehicle-profile-summary"><div><span>Status</span><strong>{vehicle.status}</strong></div><div><span>Mileage</span><strong>{vehicle.current_odometer_miles != null ? vehicle.current_odometer_miles.toLocaleString() : "—"}</strong></div><div><span>Race number</span><strong>{vehicle.race_number ?? "—"}</strong></div><div><span>Class</span><strong>{vehicle.competition_class ?? "—"}</strong></div></section>
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">MAINTENANCE HISTORY</p><h2>Service records</h2></div><div className="section-heading-actions"><span>{maintenance?.length ?? 0} logged</span><Link className="button primary" href={`/dashboard/vehicles/${id}/service/new`}>+ Add service</Link></div></div>
      {maintenance?.length ? <ServiceRecords vehicleId={id} records={maintenance} /> : <div className="empty-state"><strong>No maintenance logged.</strong><p>Add the first service record when work is completed.</p></div>}
    </section>
  </main>;
}
