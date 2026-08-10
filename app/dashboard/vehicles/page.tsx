import { createVehicle } from "@/app/actions";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function VehiclesPage() {
  const supabase = await createClient();
  const { data: vehicles } = await supabase.from("vehicles").select("id,business_id,name,status").order("name");
  return (
    <main className="dashboard-main">
      <section className="page-title"><p className="eyebrow">THE BALLS</p><h1>Vehicles</h1><p>Every event, session and checklist starts with the car.</p></section>
      <div className="split-layout">
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
        <aside className="form-card sticky-card">
          <p className="eyebrow">ADD TO THE PIT</p><h2>New vehicle</h2>
          <form className="stack-form" action={createVehicle}>
            <label>Vehicle name<input name="name" placeholder="Snowball" required /></label>
            <label>Short code<input name="business_id" placeholder="SB" maxLength={8} required /></label>
            <button className="button primary">Add vehicle</button>
          </form>
        </aside>
      </div>
    </main>
  );
}
