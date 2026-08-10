import { createPadSet, createTireSet } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

export default async function ConsumablesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data: vehicles }, { data: tires }, { data: pads }] = await Promise.all([
    supabase.from("vehicles").select("id,name").eq("status", "active").order("name"),
    supabase.from("tire_sets").select("*,vehicles(name)").order("created_at", { ascending: false }),
    supabase.from("pad_sets").select("*,vehicles(name)").order("created_at", { ascending: false }),
  ]);
  const vehicleOptions = vehicles?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>);
  return <main className="dashboard-main"><section className="page-title"><p className="eyebrow">WHAT&apos;S ON THE CAR</p><h1>Tires + Pads</h1><p>Create each physical set once, assign it to a vehicle, then select it when creating an event.</p></section>
    {query.error && <p className="alert">That set could not be saved. Check the ID and required fields.</p>}
    <div className="asset-form-grid"><section className="form-card"><p className="eyebrow">NEW TIRE SET</p><h2>Tires</h2><form className="form-grid" action={createTireSet}>
      <label>Vehicle<select name="vehicle_id" required><option value="">Select vehicle</option>{vehicleOptions}</select></label><label>Set ID<input name="business_id" placeholder="GB-TIRE-004" required /></label>
      <label>Manufacturer<input name="manufacturer" placeholder="Bridgestone" required /></label><label>Model<input name="model" placeholder="RE-71RS" required /></label>
      <label>Size<input name="size" placeholder="295/30R18" /></label><label>Compound<input name="compound" /></label><label>Purchased<input name="purchased_on" type="date" /></label><label>Previous sessions<input name="starting_sessions" type="number" min="0" /></label>
      <label className="span-2">Notes<textarea name="notes" rows={2} /></label><button className="button primary span-2">Add tire set</button></form></section>
      <section className="form-card"><p className="eyebrow">NEW PAD SET</p><h2>Brake pads</h2><form className="form-grid" action={createPadSet}>
      <label>Vehicle<select name="vehicle_id" required><option value="">Select vehicle</option>{vehicleOptions}</select></label><label>Set ID<input name="business_id" placeholder="GB-FPAD-004" required /></label>
      <label>Axle<select name="axle" required><option value="front">Front</option><option value="rear">Rear</option></select></label><label>Manufacturer<input name="manufacturer" placeholder="Cobalt" required /></label>
      <label>Model<input name="model" required /></label><label>Compound<input name="compound" /></label><label>Purchased<input name="purchased_on" type="date" /></label><label>Previous sessions<input name="starting_sessions" type="number" min="0" /></label>
      <label className="span-2">Notes<textarea name="notes" rows={2} /></label><button className="button primary span-2">Add pad set</button></form></section></div>
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">INVENTORY</p><h2>Active sets</h2></div><span>{(tires?.length ?? 0) + (pads?.length ?? 0)} total</span></div>
      <div className="inventory-grid"><div><h3>Tires</h3>{tires?.map((x) => <article className="inventory-row" key={x.id}><strong>{x.business_id}</strong><span>{x.vehicles?.name} · {x.manufacturer} {x.model} {x.size ?? ""}</span><b>{x.status}</b></article>)}</div><div><h3>Pads</h3>{pads?.map((x) => <article className="inventory-row" key={x.id}><strong>{x.business_id}</strong><span>{x.vehicles?.name} · {x.manufacturer} {x.model} · {x.axle}</span><b>{x.status}</b></article>)}</div></div>
    </section>
  </main>;
}
