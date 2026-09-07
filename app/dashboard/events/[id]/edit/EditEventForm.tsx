"use client";

import Link from "next/link";
import { useState } from "react";
import { updateEvent } from "@/app/actions";

type EventRecord = {
  id: string;
  vehicle_id: string | null;
  event_date: string;
  event_name: string;
  organization_name: string | null;
  event_type_id: string | null;
  team_id: string | null;
  driver_name: string | null;
  status: string;
  track_id: string | null;
  configuration_id: string | null;
  tire_set_id: string | null;
  front_pad_set_id: string | null;
  rear_pad_set_id: string | null;
};
type Vehicle = { id: string; name: string; status: string };
type Configuration = { id: string; name: string; is_active: boolean };
type Track = { id: string; name: string; short_name: string | null; is_active: boolean; track_configurations: Configuration[] };
type Tire = { id: string; business_id: string; vehicle_id: string; status: string; manufacturer: string; model: string; size: string | null; compound: string | null };
type Pad = { id: string; business_id: string; vehicle_id: string; axle: string; status: string; manufacturer: string; model: string; compound: string | null };
type Option = { id: string; name: string };

export default function EditEventForm({ event, vehicles, tracks, tires, pads, eventTypes, teams }: {
  event: EventRecord;
  vehicles: Vehicle[];
  tracks: Track[];
  tires: Tire[];
  pads: Pad[];
  eventTypes: Option[];
  teams: Option[];
}) {
  const initialVehicleId = event.vehicle_id ?? "";
  const [vehicleId, setVehicleId] = useState(initialVehicleId);
  const activeVehicleTires = tires.filter((tire) =>
    tire.vehicle_id === vehicleId && (tire.status === "active" || (vehicleId === initialVehicleId && tire.id === event.tire_set_id))
  );
  const activeVehiclePads = pads.filter((pad) =>
    pad.vehicle_id === vehicleId && (pad.status === "active" || (vehicleId === initialVehicleId && (pad.id === event.front_pad_set_id || pad.id === event.rear_pad_set_id)))
  );
  const tireLabel = (set: Tire) => `${[set.manufacturer, set.model, set.size, set.compound].filter(Boolean).join(" · ")} — ${set.business_id}${set.status !== "active" ? " (currently assigned · retired)" : ""}`;
  const padLabel = (set: Pad) => `${[set.manufacturer, set.model, set.compound].filter(Boolean).join(" · ")} — ${set.business_id}${set.status !== "active" ? " (currently assigned · retired)" : ""}`;
  const initialValue = (id: string | null) => vehicleId === initialVehicleId ? id ?? "" : "";

  return (
    <form className="event-form" action={updateEvent}>
      <input type="hidden" name="event_id" value={event.id} />
      <section className="form-section">
        <div className="form-section-number">01</div><div className="form-section-copy"><p className="eyebrow">WHO + WHAT</p><h2>Event identity</h2></div>
        <div className="form-grid">
          <label>Vehicle<select name="vehicle_id" value={vehicleId} onChange={(changeEvent) => setVehicleId(changeEvent.target.value)} required><option value="">Select a Ball</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}{vehicle.status !== "active" ? " (inactive)" : ""}</option>)}</select></label>
          <label>Date<input name="event_date" type="date" defaultValue={event.event_date} required /></label>
          <label className="span-2">Event name<input name="event_name" defaultValue={event.event_name} required /></label>
          <label>Organization<input name="organization_name" defaultValue={event.organization_name ?? ""} /></label>
          <label>Event type<select name="event_type_id" defaultValue={event.event_type_id ?? ""}><option value="">Not assigned</option>{eventTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
          <label>Team<select name="team_id" defaultValue={event.team_id ?? ""}><option value="">Not assigned</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
          <label>Driver<input name="driver_name" defaultValue={event.driver_name ?? ""} /></label>
          <label>Status<select name="status" defaultValue={event.status}><option value="planned">Planned</option><option value="active">Active</option><option value="complete">Complete</option><option value="cancelled">Cancelled</option><option value="needs_review">Needs review</option></select></label>
        </div>
      </section>
      <section className="form-section">
        <div className="form-section-number">02</div><div className="form-section-copy"><p className="eyebrow">WHERE</p><h2>Track</h2></div>
        <div className="form-grid">
          <label>Track<select name="track_id" defaultValue={event.track_id ?? ""} required><option value="">Select track</option>{tracks.map((track) => <option key={track.id} value={track.id}>{track.name}{!track.is_active ? " (inactive)" : ""}</option>)}</select></label>
          <label>Configuration<select name="configuration_id" defaultValue={event.configuration_id ?? ""} required><option value="">Select configuration</option>{tracks.map((track) => <optgroup label={track.short_name ?? track.name} key={track.id}>{track.track_configurations.map((configuration) => <option value={configuration.id} key={configuration.id}>{configuration.name}{!configuration.is_active ? " (inactive)" : ""}</option>)}</optgroup>)}</select></label>
        </div>
        <p className="form-note">Weather refreshes automatically when this event is saved.</p>
      </section>
      <section className="form-section">
        <div className="form-section-number">03</div><div className="form-section-copy"><p className="eyebrow">WHAT&apos;S ON THE CAR</p><h2>Consumables</h2></div>
        <div className="form-grid three">
          <label>Tire set<select key={`tire-${vehicleId}`} name="tire_set_id" disabled={!vehicleId} defaultValue={initialValue(event.tire_set_id)}><option value="">{vehicleId ? "Not assigned" : "Select a vehicle first"}</option>{activeVehicleTires.map((tire) => <option value={tire.id} key={tire.id}>{tireLabel(tire)}</option>)}</select></label>
          <label>Front pads<select key={`front-${vehicleId}`} name="front_pad_set_id" disabled={!vehicleId} defaultValue={initialValue(event.front_pad_set_id)}><option value="">{vehicleId ? "Not assigned" : "Select a vehicle first"}</option>{activeVehiclePads.filter((pad) => pad.axle === "front").map((pad) => <option value={pad.id} key={pad.id}>{padLabel(pad)}</option>)}</select></label>
          <label>Rear pads<select key={`rear-${vehicleId}`} name="rear_pad_set_id" disabled={!vehicleId} defaultValue={initialValue(event.rear_pad_set_id)}><option value="">{vehicleId ? "Not assigned" : "Select a vehicle first"}</option>{activeVehiclePads.filter((pad) => pad.axle === "rear").map((pad) => <option value={pad.id} key={pad.id}>{padLabel(pad)}</option>)}</select></label>
        </div>
      </section>
      <div className="form-submit"><Link className="button ghost light" href={`/dashboard/events/${event.id}`}>Cancel</Link><button className="button primary large">Save event</button></div>
    </form>
  );
}
