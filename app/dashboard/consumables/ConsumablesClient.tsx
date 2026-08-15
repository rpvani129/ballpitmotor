"use client";

import Link from "next/link";
import { deleteConsumable } from "@/app/actions";
import DeleteRecordButton from "../DeleteRecordButton";
export type Asset = {
  id: string; business_id: string; vehicle_id: string; manufacturer: string; model: string;
  size?: string | null; compound: string | null; axle?: string; purchased_on: string | null;
  starting_sessions: number | null; status: string; notes: string | null;
  is_current: boolean;
  vehicles: { name: string } | null; loggedSessions: number; totalSessions: number;
};

export default function ConsumablesClient({ tab, tires, pads }: { tab: "tires" | "pads"; tires: Asset[]; pads: Asset[] }) {
  const assets = tab === "tires" ? tires : pads;
  const bySessionCount = (a: Asset, b: Asset) => b.totalSessions - a.totalSessions || a.business_id.localeCompare(b.business_id);
  const active = assets.filter(x => x.status === "active").sort(bySessionCount);
  const retired = assets.filter(x => x.status !== "active").sort(bySessionCount);
  const rows = (items: Asset[]) => items.map(asset => <article className={`consumable-row ${asset.status !== "active" ? "retired" : ""}`} key={asset.id}>
    <div><strong>{asset.manufacturer} {asset.model}</strong><span>{tab === "tires" ? asset.size : `${asset.axle} axle`}{asset.compound ? ` · ${asset.compound}` : ""}</span></div>
    <div><b className="consumable-code">{asset.business_id}</b><span>{asset.vehicles?.name ?? "Unassigned"}{asset.is_current ? " · Currently installed" : ""}</span></div>
    <div className="session-count"><strong>{asset.totalSessions}</strong><span>sessions</span>{asset.starting_sessions ? <small>{asset.loggedSessions} calculated + {asset.starting_sessions} previous</small> : <small>{asset.loggedSessions} calculated</small>}</div>
    <div className="record-actions"><Link className="button ghost compact-button" href={`/dashboard/consumables/${tab}/${asset.id}/edit`}>Edit</Link><DeleteRecordButton action={deleteConsumable} fields={{ asset_id: asset.id, kind: tab }} confirmMessage={`Delete ${asset.business_id}? Sets assigned to events cannot be deleted.`} /></div>
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
    <section className="section-block consumable-inventory"><div className="section-heading"><div><p className="eyebrow">CURRENT INVENTORY</p><h2>{tab === "tires" ? "Tire sets" : "Pad sets"}</h2></div><Link className="button primary" href={`/dashboard/consumables/${tab}/new`}>+ Add {tab === "tires" ? "tires" : "pads"}</Link></div>
      {tab === "pads"
        ? padColumns(active)
        : <div className="consumable-list">{active.length ? rows(active) : <div className="empty-state compact"><strong>No active sets.</strong></div>}</div>}
      {retired.length > 0 && <div className="retired-section"><p className="eyebrow">RETIRED / SOLD</p>{tab === "pads" ? padColumns(retired) : rows(retired)}</div>}
    </section>
  </>;
}
