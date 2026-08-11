"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createPadSet, createTireSet, updatePadSet, updateTireSet } from "@/app/actions";

type Vehicle = { id: string; name: string };
export type Asset = {
  id: string; business_id: string; vehicle_id: string; manufacturer: string; model: string;
  size?: string | null; compound: string | null; axle?: string; purchased_on: string | null;
  starting_sessions: number | null; status: string; notes: string | null;
  vehicles: { name: string } | null; loggedSessions: number; totalSessions: number;
};

function AssetForm({ kind, vehicles, asset }: { kind: "tires" | "pads"; vehicles: Vehicle[]; asset?: Asset }) {
  const isTire = kind === "tires";
  const action = asset ? (isTire ? updateTireSet : updatePadSet) : (isTire ? createTireSet : createPadSet);
  return <form className="form-grid consumable-form" action={action}>
    {asset && <input type="hidden" name="id" value={asset.id} />}
    <label>Vehicle<select name="vehicle_id" defaultValue={asset?.vehicle_id ?? ""} required><option value="">Select vehicle</option>{vehicles.map(v => <option value={v.id} key={v.id}>{v.name}</option>)}</select></label>
    <label>Set ID<input name="business_id" defaultValue={asset?.business_id} placeholder={isTire ? "GB-TIRE-004" : "GB-FPAD-004"} required /></label>
    {!isTire && <label>Axle<select name="axle" defaultValue={asset?.axle ?? "front"}><option value="front">Front</option><option value="rear">Rear</option></select></label>}
    <label>Manufacturer<input name="manufacturer" defaultValue={asset?.manufacturer} required /></label>
    <label>Model<input name="model" defaultValue={asset?.model} required /></label>
    {isTire && <label>Size<input name="size" defaultValue={asset?.size ?? ""} /></label>}
    <label>Compound<input name="compound" defaultValue={asset?.compound ?? ""} /></label>
    <label>Purchased<input name="purchased_on" type="date" defaultValue={asset?.purchased_on ?? ""} /></label>
    <label>Previous sessions<input name="starting_sessions" type="number" min="0" defaultValue={asset?.starting_sessions ?? ""} /></label>
    {asset && <label>Status<select name="status" defaultValue={asset.status}><option value="active">Active</option><option value="retired">Retired</option><option value="sold">Sold</option></select></label>}
    <label className="span-2">Notes<textarea name="notes" rows={3} defaultValue={asset?.notes ?? ""} /></label>
    <button className="button primary span-2">{asset ? "Save changes" : `Add ${isTire ? "tire" : "pad"} set`}</button>
  </form>;
}

export default function ConsumablesClient({ tab, vehicles, tires, pads }: { tab: "tires" | "pads"; vehicles: Vehicle[]; tires: Asset[]; pads: Asset[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<Asset | undefined>();
  const assets = tab === "tires" ? tires : pads;
  const bySessionCount = (a: Asset, b: Asset) => b.totalSessions - a.totalSessions || a.business_id.localeCompare(b.business_id);
  const active = assets.filter(x => x.status === "active").sort(bySessionCount);
  const retired = assets.filter(x => x.status !== "active").sort(bySessionCount);
  const open = (asset?: Asset) => { setEditing(asset); dialog.current?.showModal(); };
  const rows = (items: Asset[]) => items.map(asset => <article className={`consumable-row ${asset.status !== "active" ? "retired" : ""}`} key={asset.id}>
    <div><strong>{asset.business_id}</strong><span>{asset.vehicles?.name ?? "Unassigned"}</span></div>
    <div><b>{asset.manufacturer} {asset.model}</b><span>{tab === "tires" ? asset.size : asset.axle}{asset.compound ? ` · ${asset.compound}` : ""}</span></div>
    <div className="session-count"><strong>{asset.totalSessions}</strong><span>sessions</span>{asset.starting_sessions ? <small>{asset.loggedSessions} calculated + {asset.starting_sessions} previous</small> : <small>{asset.loggedSessions} calculated</small>}</div>
    <button className="button ghost compact-button" type="button" onClick={() => open(asset)}>Edit</button>
  </article>);
  const padColumns = (items: Asset[]) => <div className="pad-axle-grid">
    {(["front", "rear"] as const).map(axle => {
      const axleItems = items.filter(asset => asset.axle === axle);
      return <section className="pad-axle-column" key={axle}>
        <div className="pad-axle-heading"><h3>{axle} axle</h3><span>{axleItems.length} sets</span></div>
        <div className="consumable-list">{axleItems.length ? rows(axleItems) : <div className="empty-state compact"><strong>No {axle} sets.</strong></div>}</div>
      </section>;
    })}
  </div>;
  return <>
    <nav className="consumable-tabs" aria-label="Consumable type"><Link className={tab === "tires" ? "active" : ""} href="?tab=tires">Tires <span>{tires.length}</span></Link><Link className={tab === "pads" ? "active" : ""} href="?tab=pads">Pads <span>{pads.length}</span></Link></nav>
    <section className="section-block consumable-inventory"><div className="section-heading"><div><p className="eyebrow">CURRENT INVENTORY</p><h2>{tab === "tires" ? "Tire sets" : "Pad sets"}</h2></div><button className="button primary" type="button" onClick={() => open()}>+ Add {tab === "tires" ? "tires" : "pads"}</button></div>
      {tab === "pads"
        ? padColumns(active)
        : <div className="consumable-list">{active.length ? rows(active) : <div className="empty-state compact"><strong>No active sets.</strong></div>}</div>}
      {retired.length > 0 && <div className="retired-section"><p className="eyebrow">RETIRED / SOLD</p>{tab === "pads" ? padColumns(retired) : rows(retired)}</div>}
    </section>
    <dialog className="asset-dialog" ref={dialog} onClick={e => { if (e.target === dialog.current) dialog.current?.close(); }}>
      <div className="dialog-heading"><div><p className="eyebrow">{editing ? "EDIT RECORD" : "NEW RECORD"}</p><h2>{editing ? editing.business_id : `Add ${tab === "tires" ? "tire" : "pad"} set`}</h2></div><button type="button" className="dialog-close" onClick={() => dialog.current?.close()} aria-label="Close">×</button></div>
      <AssetForm kind={tab} vehicles={vehicles} asset={editing} />
    </dialog>
  </>;
}
