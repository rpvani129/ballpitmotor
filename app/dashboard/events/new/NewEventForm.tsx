"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { createEvent } from "@/app/actions";

type Vehicle = { id: string; name: string };
type Configuration = { id: string; name: string; is_active: boolean };
type Track = { id: string; name: string; short_name: string | null; track_configurations: Configuration[] };
type Tire = { id: string; business_id: string; vehicle_id: string; manufacturer: string; model: string; size: string | null; compound: string | null; is_current: boolean };
type Pad = { id: string; business_id: string; vehicle_id: string; axle: string; manufacturer: string; model: string; compound: string | null; is_current: boolean };
type Option = { id: string; name: string };

const Required = () => <span className="required-marker" aria-hidden="true">*</span>;
const RequiredLabel = ({ children }: { children: ReactNode }) => <span className="field-label">{children} <Required /></span>;

export default function NewEventForm({ vehicles, tracks, tires, pads, eventTypes, teams, defaultTeamId, defaultDriverName }: {
  vehicles: Vehicle[];
  tracks: Track[];
  tires: Tire[];
  pads: Pad[];
  eventTypes: Option[];
  teams: Option[];
  defaultTeamId: string;
  defaultDriverName: string;
}) {
  const [vehicleId, setVehicleId] = useState("");
  const [trackId, setTrackId] = useState("");
  const selectedTrack = tracks.find((track) => track.id === trackId);
  const vehicleTires = tires.filter((tire) => tire.vehicle_id === vehicleId);
  const vehiclePads = pads.filter((pad) => pad.vehicle_id === vehicleId);
  const tireLabel = (tire: Tire) => `${[tire.manufacturer, tire.model, tire.size, tire.compound].filter(Boolean).join(" · ")} — ${tire.business_id}`;
  const padLabel = (pad: Pad) => `${[pad.manufacturer, pad.model, pad.compound].filter(Boolean).join(" · ")} — ${pad.business_id}`;

  return (
    <form className="event-form" action={createEvent}>
      <p className="required-legend"><Required /> Required field</p>
      <section className="form-section">
        <div className="form-section-number">01</div><div className="form-section-copy"><p className="eyebrow">WHO + WHAT</p><h2>Event identity</h2></div>
        <div className="form-grid">
          <label><RequiredLabel>Vehicle</RequiredLabel><select name="vehicle_id" required value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}><option value="">Select a Ball</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>)}</select></label>
          <label><RequiredLabel>Date</RequiredLabel><input name="event_date" type="date" required /></label>
          <label className="span-2"><RequiredLabel>Event name</RequiredLabel><input name="event_name" placeholder="SCCA Time Trials" required /></label>
          <label>Organization<input name="organization_name" placeholder="SCCA" /></label>
          <label>Event type<select name="event_type_id"><option value="">Not assigned</option>{eventTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
          <label>Team<select name="team_id" defaultValue={defaultTeamId}><option value="">Not assigned</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
          <label>Driver<input name="driver_name" defaultValue={defaultDriverName} /></label>
        </div>
      </section>
      <section className="form-section">
        <div className="form-section-number">02</div><div className="form-section-copy"><p className="eyebrow">WHERE</p><h2>Track</h2></div>
        <div className="form-grid">
          <label><RequiredLabel>Track</RequiredLabel><select name="track_id" required value={trackId} onChange={(event) => setTrackId(event.target.value)}><option value="">Select track</option>{tracks.map((track) => <option key={track.id} value={track.id}>{track.name}</option>)}</select></label>
          <label><RequiredLabel>Configuration</RequiredLabel><select key={trackId} name="configuration_id" required disabled={!selectedTrack} defaultValue=""><option value="">{selectedTrack ? "Select configuration" : "Select a track first"}</option>{selectedTrack?.track_configurations.filter((configuration) => configuration.is_active).map((configuration) => <option value={configuration.id} key={configuration.id}>{configuration.name}</option>)}</select></label>
        </div>
        <p className="form-note">Weather is captured automatically from the selected track and date.</p>
      </section>
      <section className="form-section">
        <div className="form-section-number">03</div><div className="form-section-copy"><p className="eyebrow">WHAT&apos;S ON THE CAR</p><h2>Consumables</h2></div>
        <div className="form-grid three">
          <label>Tire set<select key={`tire-${vehicleId}`} name="tire_set_id" disabled={!vehicleId} defaultValue={vehicleTires.find((tire) => tire.is_current)?.id ?? ""}><option value="">{vehicleId ? "Not assigned" : "Select a vehicle first"}</option>{vehicleTires.map((tire) => <option value={tire.id} key={tire.id}>{tireLabel(tire)}</option>)}</select></label>
          <label>Front pads<select key={`front-${vehicleId}`} name="front_pad_set_id" disabled={!vehicleId} defaultValue={vehiclePads.find((pad) => pad.axle === "front" && pad.is_current)?.id ?? ""}><option value="">{vehicleId ? "Not assigned" : "Select a vehicle first"}</option>{vehiclePads.filter((pad) => pad.axle === "front").map((pad) => <option value={pad.id} key={pad.id}>{padLabel(pad)}</option>)}</select></label>
          <label>Rear pads<select key={`rear-${vehicleId}`} name="rear_pad_set_id" disabled={!vehicleId} defaultValue={vehiclePads.find((pad) => pad.axle === "rear" && pad.is_current)?.id ?? ""}><option value="">{vehicleId ? "Not assigned" : "Select a vehicle first"}</option>{vehiclePads.filter((pad) => pad.axle === "rear").map((pad) => <option value={pad.id} key={pad.id}>{padLabel(pad)}</option>)}</select></label>
          <label className="span-3">Notes<textarea name="notes" rows={3} placeholder="Setup, goals, guests or anything worth remembering." /></label>
        </div>
      </section>
      <div className="form-submit"><button className="button primary large">Create Event ID</button><span>Sessions come next.</span></div>
    </form>
  );
}
