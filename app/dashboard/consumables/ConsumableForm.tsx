import Link from "next/link";
import { createPadSet, createTireSet, updatePadSet, updateTireSet } from "@/app/actions";
import type { Asset } from "./ConsumablesClient";

type Vehicle = { id: string; name: string };

export default function ConsumableForm({ kind, vehicles, asset }: { kind: "tires" | "pads"; vehicles: Vehicle[]; asset?: Asset }) {
  const isTire = kind === "tires";
  const action = asset ? (isTire ? updateTireSet : updatePadSet) : (isTire ? createTireSet : createPadSet);
  return <form className="event-form record-form" action={action}>
    {asset && <input type="hidden" name="id" value={asset.id} />}
    <section className="form-section">
      <div className="form-section-number">01</div><div className="form-section-copy"><p className="eyebrow">ASSIGNMENT</p><h2>Set identity</h2></div>
      <div className="form-grid">
        <label>Vehicle<select name="vehicle_id" defaultValue={asset?.vehicle_id ?? ""} required><option value="">Select vehicle</option>{vehicles.map(vehicle => <option value={vehicle.id} key={vehicle.id}>{vehicle.name}</option>)}</select></label>
        <label>Set ID<input name="business_id" defaultValue={asset?.business_id ?? ""} placeholder={isTire ? "GB-TIRE-004" : "GB-FPAD-004"} required /></label>
        {!isTire && <label>Axle<select name="axle" defaultValue={asset?.axle ?? "front"}><option value="front">Front</option><option value="rear">Rear</option></select></label>}
        {asset && <label>Status<select name="status" defaultValue={asset.status}><option value="active">Active</option><option value="retired">Retired</option><option value="sold">Sold</option></select></label>}
        <label className="setting-toggle span-2"><input name="is_current" type="checkbox" defaultChecked={asset?.is_current ?? false} /> Currently installed on vehicle<small>Choosing this removes the current flag from the other {isTire ? "tire set" : "pad set on this axle"}.</small></label>
      </div>
    </section>
    <section className="form-section">
      <div className="form-section-number">02</div><div className="form-section-copy"><p className="eyebrow">SPECIFICATION</p><h2>Description</h2></div>
      <div className="form-grid">
        <label>Manufacturer<input name="manufacturer" defaultValue={asset?.manufacturer ?? ""} required /></label><label>Model<input name="model" defaultValue={asset?.model ?? ""} required /></label>
        {isTire && <label>Size<input name="size" defaultValue={asset?.size ?? ""} /></label>}<label>Compound<input name="compound" defaultValue={asset?.compound ?? ""} /></label>
        <label>Purchased<input name="purchased_on" type="date" defaultValue={asset?.purchased_on ?? ""} /></label><label>Previous sessions<input name="starting_sessions" type="number" min="0" defaultValue={asset?.starting_sessions ?? ""} /></label>
        <label className="span-2">Notes<textarea name="notes" rows={4} defaultValue={asset?.notes ?? ""} /></label>
      </div>
    </section>
    <div className="form-submit"><Link className="button ghost light" href={`/dashboard/consumables?tab=${kind}`}>Cancel</Link><button className="button primary large">{asset ? "Save changes" : `Add ${isTire ? "tire" : "pad"} set`}</button></div>
  </form>;
}
