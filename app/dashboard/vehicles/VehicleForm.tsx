import Link from "next/link";

type Vehicle = { id: string; business_id: string; name: string; status: string; year: number | null; make: string | null; model: string | null; trim: string | null; race_number: string | null; competition_class: string | null; description: string | null; wiki_url: string | null; image_url: string | null; current_odometer_miles: number | null; acquired_on: string | null; };

export default function VehicleForm({ vehicle, action }: { vehicle?: Vehicle; action: (formData: FormData) => void | Promise<void> }) {
  const cancelHref = vehicle ? `/dashboard/vehicles/${vehicle.id}` : "/dashboard/vehicles";
  return <form className="event-form record-form" action={action}>
    {vehicle && <input type="hidden" name="vehicle_id" value={vehicle.id} />}
    <section className="form-section">
      <div className="form-section-number">01</div><div className="form-section-copy"><p className="eyebrow">GARAGE FILE</p><h2>Identity</h2></div>
      <div className="form-grid">
        <label>Vehicle name<input name="name" defaultValue={vehicle?.name ?? ""} placeholder="Snowball" required /></label>
        {!vehicle ? <label>Short code<input name="business_id" defaultValue="" placeholder="SB" maxLength={8} required /></label> : <label>Short code<input value={vehicle.business_id} disabled /></label>}
        {vehicle && <label>Status<select name="status" defaultValue={vehicle.status}><option>active</option><option>retired</option><option>sold</option></select></label>}
        {vehicle && <><label>Year<input name="year" type="number" defaultValue={vehicle.year ?? ""} /></label><label>Make<input name="make" defaultValue={vehicle.make ?? ""} /></label><label>Model<input name="model" defaultValue={vehicle.model ?? ""} /></label><label>Trim / generation<input name="trim" defaultValue={vehicle.trim ?? ""} /></label><label>Race number<input name="race_number" defaultValue={vehicle.race_number ?? ""} /></label><label>Competition class<input name="competition_class" defaultValue={vehicle.competition_class ?? ""} /></label></>}
      </div>
    </section>
    {vehicle && <section className="form-section">
      <div className="form-section-number">02</div><div className="form-section-copy"><p className="eyebrow">DETAILS</p><h2>History</h2></div>
      <div className="form-grid"><label>Current mileage<input name="current_odometer_miles" type="number" min="0" defaultValue={vehicle.current_odometer_miles ?? ""} /></label><label>Acquired<input name="acquired_on" type="date" defaultValue={vehicle.acquired_on ?? ""} /></label><label className="span-2">Ball Wiki URL<input name="wiki_url" type="url" defaultValue={vehicle.wiki_url ?? ""} /></label><label className="span-2">Image URL<input name="image_url" type="url" defaultValue={vehicle.image_url ?? ""} /></label><label className="span-2">Description<textarea name="description" rows={5} defaultValue={vehicle.description ?? ""} /></label></div>
    </section>}
    <div className="form-submit"><Link className="button ghost light" href={cancelHref}>Cancel</Link><button className="button primary large">{vehicle ? "Save vehicle" : "Add vehicle"}</button></div>
  </form>;
}
