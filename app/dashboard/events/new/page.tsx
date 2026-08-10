import { createEvent } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

export default async function NewEventPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data: vehicles }, { data: tracks }, { data: tires }, { data: pads }] = await Promise.all([
    supabase.from("vehicles").select("id,name,business_id").eq("status", "active").order("name"),
    supabase.from("tracks").select("id,name,short_name,track_configurations(id,name,is_active)").eq("is_active", true).order("name"),
    supabase.from("tire_sets").select("id,business_id,vehicle_id").eq("status", "active").order("business_id"),
    supabase.from("pad_sets").select("id,business_id,vehicle_id,axle").eq("status", "active").order("business_id"),
  ]);
  return (
    <main className="dashboard-main">
      <section className="page-title"><p className="eyebrow">EVENT-FIRST WORKFLOW</p><h1>Create event</h1><p>Event Index owns the day. Sessions inherit its car, driver, track, organization, weather and consumables.</p></section>
      {query.error && <p className="alert">The event could not be created. Review the required fields and try again.</p>}
      <form className="event-form" action={createEvent}>
        <section className="form-section">
          <div className="form-section-number">01</div><div className="form-section-copy"><p className="eyebrow">WHO + WHAT</p><h2>Event identity</h2></div>
          <div className="form-grid">
            <label>Vehicle<select name="vehicle_id" required><option value="">Select a Ball</option>{vehicles?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
            <label>Date<input name="event_date" type="date" required /></label>
            <label className="span-2">Event name<input name="event_name" placeholder="SCCA Time Trials" required /></label>
            <label>Organization<input name="organization_name" placeholder="SCCA" /></label>
            <label>Event type<select name="event_type"><option>Competition / Organized Event</option><option>Member / Open Track Day</option><option>Race School</option><option>Rental</option></select></label>
            <label>Team<input name="team_name" defaultValue="Ball Pit Motor" /></label>
            <label>Driver<input name="driver_name" defaultValue="Roshan Vani" /></label>
          </div>
        </section>
        <section className="form-section">
          <div className="form-section-number">02</div><div className="form-section-copy"><p className="eyebrow">WHERE</p><h2>Track</h2></div>
          <div className="form-grid">
            <label>Track<select name="track_id" required><option value="">Select track</option>{tracks?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
            <label>Configuration<select name="configuration_id" required><option value="">Select configuration</option>{tracks?.map((t) => <optgroup label={t.short_name ?? t.name} key={t.id}>{t.track_configurations?.filter((c: { is_active: boolean }) => c.is_active).map((c: { id: string; name: string }) => <option value={c.id} key={c.id}>{c.name}</option>)}</optgroup>)}</select></label>
          </div>
          <p className="form-note">Weather is captured automatically from the selected track and date.</p>
        </section>
        <section className="form-section">
          <div className="form-section-number">03</div><div className="form-section-copy"><p className="eyebrow">WHAT&apos;S ON THE CAR</p><h2>Consumables</h2></div>
          <div className="form-grid three">
            <label>Tire set<select name="tire_set_id"><option value="">Not assigned</option>{tires?.map((x) => <option value={x.id} key={x.id}>{x.business_id}</option>)}</select></label>
            <label>Front pads<select name="front_pad_set_id"><option value="">Not assigned</option>{pads?.filter((x) => x.axle === "front").map((x) => <option value={x.id} key={x.id}>{x.business_id}</option>)}</select></label>
            <label>Rear pads<select name="rear_pad_set_id"><option value="">Not assigned</option>{pads?.filter((x) => x.axle === "rear").map((x) => <option value={x.id} key={x.id}>{x.business_id}</option>)}</select></label>
            <label className="span-3">Notes<textarea name="notes" rows={3} placeholder="Setup, goals, guests or anything worth remembering." /></label>
          </div>
        </section>
        <div className="form-submit"><button className="button primary large">Create Event ID</button><span>Sessions come next.</span></div>
      </form>
    </main>
  );
}
