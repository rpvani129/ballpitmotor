import Link from "next/link";
import { notFound } from "next/navigation";
import { updateEvent } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

export default async function EditEventPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data: event }, { data: vehicles }, { data: tracks }, { data: tires }, { data: pads }, { data: eventTypes }, { data: teams }] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).single(),
    supabase.from("vehicles").select("id,name,business_id,status").order("name"),
    supabase.from("tracks").select("id,name,short_name,is_active,track_configurations(id,name,is_active)").order("name"),
    supabase.from("tire_sets").select("id,business_id,vehicle_id,status,manufacturer,model,size,compound").order("business_id"),
    supabase.from("pad_sets").select("id,business_id,vehicle_id,axle,status,manufacturer,model,compound").order("business_id"),
    supabase.from("event_types").select("id,name").order("name"),
    supabase.from("teams").select("id,name").order("name"),
  ]);
  if (!event) notFound();
  const tireLabel = (set: { business_id: string; manufacturer: string; model: string; size: string | null; compound: string | null; status: string }) =>
    `${[set.manufacturer, set.model, set.size, set.compound].filter(Boolean).join(" · ")} — ${set.business_id}${set.status !== "active" ? ` (${set.status})` : ""}`;
  const padLabel = (set: { business_id: string; manufacturer: string; model: string; compound: string | null; status: string }) =>
    `${[set.manufacturer, set.model, set.compound].filter(Boolean).join(" · ")} — ${set.business_id}${set.status !== "active" ? ` (${set.status})` : ""}`;

  return (
    <main className="dashboard-main">
      <Link className="back-link" href={`/dashboard/events/${id}`}>← Back to event</Link>
      <section className="page-title"><p className="eyebrow">{event.business_id}</p><h1>Edit event</h1><p>Update the event record and reassign the tires or brake pads used for the day.</p></section>
      {query.error && <p className="alert">The event could not be saved. Review the required fields and consumable assignments.</p>}
      <form className="event-form" action={updateEvent}>
        <input type="hidden" name="event_id" value={event.id} />
        <section className="form-section">
          <div className="form-section-number">01</div><div className="form-section-copy"><p className="eyebrow">WHO + WHAT</p><h2>Event identity</h2></div>
          <div className="form-grid">
            <label>Vehicle<select name="vehicle_id" defaultValue={event.vehicle_id ?? ""} required><option value="">Select a Ball</option>{vehicles?.map((v) => <option key={v.id} value={v.id}>{v.name}{v.status !== "active" ? " (inactive)" : ""}</option>)}</select></label>
            <label>Date<input name="event_date" type="date" defaultValue={event.event_date} required /></label>
            <label className="span-2">Event name<input name="event_name" defaultValue={event.event_name} required /></label>
            <label>Organization<input name="organization_name" defaultValue={event.organization_name ?? ""} /></label>
            <label>Event type<select name="event_type_id" defaultValue={event.event_type_id ?? ""}><option value="">Not assigned</option>{eventTypes?.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
            <label>Team<select name="team_id" defaultValue={event.team_id ?? ""}><option value="">Not assigned</option>{teams?.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
            <label>Driver<input name="driver_name" defaultValue={event.driver_name ?? ""} /></label>
            <label>Status<select name="status" defaultValue={event.status}><option value="planned">Planned</option><option value="active">Active</option><option value="complete">Complete</option><option value="cancelled">Cancelled</option><option value="needs_review">Needs review</option></select></label>
          </div>
        </section>
        <section className="form-section">
          <div className="form-section-number">02</div><div className="form-section-copy"><p className="eyebrow">WHERE</p><h2>Track</h2></div>
          <div className="form-grid">
            <label>Track<select name="track_id" defaultValue={event.track_id ?? ""} required><option value="">Select track</option>{tracks?.map((t) => <option key={t.id} value={t.id}>{t.name}{!t.is_active ? " (inactive)" : ""}</option>)}</select></label>
            <label>Configuration<select name="configuration_id" defaultValue={event.configuration_id ?? ""} required><option value="">Select configuration</option>{tracks?.map((t) => <optgroup label={t.short_name ?? t.name} key={t.id}>{t.track_configurations?.map((c: { id: string; name: string; is_active: boolean }) => <option value={c.id} key={c.id}>{c.name}{!c.is_active ? " (inactive)" : ""}</option>)}</optgroup>)}</select></label>
          </div>
          <p className="form-note">Weather refreshes automatically when this event is saved.</p>
        </section>
        <section className="form-section">
          <div className="form-section-number">03</div><div className="form-section-copy"><p className="eyebrow">WHAT&apos;S ON THE CAR</p><h2>Consumables</h2></div>
          <div className="form-grid three">
            <label>Tire set<select name="tire_set_id" defaultValue={event.tire_set_id ?? ""}><option value="">Not assigned</option>{tires?.map((x) => <option value={x.id} key={x.id}>{tireLabel(x)}</option>)}</select></label>
            <label>Front pads<select name="front_pad_set_id" defaultValue={event.front_pad_set_id ?? ""}><option value="">Not assigned</option>{pads?.filter((x) => x.axle === "front").map((x) => <option value={x.id} key={x.id}>{padLabel(x)}</option>)}</select></label>
            <label>Rear pads<select name="rear_pad_set_id" defaultValue={event.rear_pad_set_id ?? ""}><option value="">Not assigned</option>{pads?.filter((x) => x.axle === "rear").map((x) => <option value={x.id} key={x.id}>{padLabel(x)}</option>)}</select></label>
          </div>
        </section>
        <div className="form-submit"><Link className="button ghost light" href={`/dashboard/events/${id}`}>Cancel</Link><button className="button primary large">Save event</button></div>
      </form>
    </main>
  );
}
