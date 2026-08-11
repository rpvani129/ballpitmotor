import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function VehiclesPage() {
  const supabase = await createClient();
  const { data: vehicles } = await supabase.from("vehicles").select("id,business_id,name,status").order("name");
  return (
    <main className="dashboard-main">
      <section className="page-title action-title"><div><p className="eyebrow">THE BALLS</p><h1>Vehicles</h1><p>Every event, session and checklist starts with the car.</p></div><Link className="button primary" href="/dashboard/vehicles/new">+ Add vehicle</Link></section>
      <div>
        <section className="section-block">
          <div className="vehicle-grid">
            {(vehicles ?? []).map((vehicle) => (
              <Link className="vehicle-card" href={`/dashboard/vehicles/${vehicle.id}`} key={vehicle.id}>
                <span className="ball-number">{vehicle.business_id}</span>
                <div><h2>{vehicle.name}</h2><p>{vehicle.status} · View garage file →</p></div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
