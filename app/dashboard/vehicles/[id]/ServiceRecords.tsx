"use client";

import { useRef } from "react";
import { addMaintenanceRecordItem, updateMaintenanceRecord, updateMaintenanceRecordItem } from "@/app/actions";

type ServiceItem = { id: string; category: string; title: string; details: string | null; quantity: string | null; line_amount: number | null; source_item_number: string | null; status: string; };
type ServiceRecord = { id: string; service_date: string; category: string; title: string; description: string | null; odometer_miles: number | null; vendor: string | null; cost: number | null; next_due_date: string | null; next_due_miles: number | null; source_url: string | null; maintenance_record_items: ServiceItem[]; };

function DialogButton({ label, children }: { label: string; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <><button type="button" className="button outline compact-button" onClick={() => dialog.current?.showModal()}>{label}</button>
    <dialog ref={dialog} className="asset-dialog"><div className="dialog-heading"><h2>{label}</h2><button type="button" className="dialog-close" onClick={() => dialog.current?.close()}>×</button></div>{children}</dialog></>;
}

const ItemFields = ({ item }: { item?: ServiceItem }) => <div className="form-grid consumable-form">
  <label>Category<input name="category" defaultValue={item?.category ?? "Maintenance"} required /></label>
  <label>Status<select name="status" defaultValue={item?.status ?? "Complete"}><option>Complete</option><option>In Progress</option><option>Deferred</option><option>Cancelled</option></select></label>
  <label className="span-2">Work performed<input name="title" defaultValue={item?.title ?? ""} required /></label>
  <label className="span-2">Details / parts<textarea name="details" rows={3} defaultValue={item?.details ?? ""} /></label>
  <label>Quantity<input name="quantity" defaultValue={item?.quantity ?? ""} /></label>
  <label>Line amount<input name="line_amount" type="number" min="0" step="0.01" defaultValue={item?.line_amount ?? ""} /></label>
  <label>Source item #<input name="source_item_number" defaultValue={item?.source_item_number ?? ""} /></label>
</div>;

export default function ServiceRecords({ vehicleId, records }: { vehicleId: string; records: ServiceRecord[] }) {
  return <div className="service-records">{records.map((record) => <article className="service-record" key={record.id}>
    <header className="service-record-header"><div><time>{new Date(`${record.service_date}T12:00:00`).toLocaleDateString()}</time><h3>{record.title}</h3><p>{record.category}{record.vendor ? ` · ${record.vendor}` : ""}</p></div><div className="service-record-actions"><strong>{record.cost != null ? `$${Number(record.cost).toFixed(2)}` : "—"}</strong>
      <DialogButton label="Edit record"><form className="form-grid consumable-form" action={updateMaintenanceRecord}><input type="hidden" name="id" value={record.id} /><input type="hidden" name="vehicle_id" value={vehicleId} />
        <label>Date<input name="service_date" type="date" defaultValue={record.service_date} required /></label><label>Category<input name="category" defaultValue={record.category} required /></label>
        <label className="span-2">Title<input name="title" defaultValue={record.title} required /></label><label>Mileage<input name="odometer_miles" type="number" min="0" defaultValue={record.odometer_miles ?? ""} /></label><label>Vendor<input name="vendor" defaultValue={record.vendor ?? ""} /></label>
        <label>Cost<input name="cost" type="number" min="0" step="0.01" defaultValue={record.cost ?? ""} /></label><label>Next due date<input name="next_due_date" type="date" defaultValue={record.next_due_date ?? ""} /></label><label>Next due mileage<input name="next_due_miles" type="number" min="0" defaultValue={record.next_due_miles ?? ""} /></label>
        <label className="span-2">Receipt / source<input name="source_url" defaultValue={record.source_url ?? ""} /></label><label className="span-2">Notes<textarea name="description" rows={4} defaultValue={record.description ?? ""} /></label><button className="button primary span-2">Save service record</button>
      </form></DialogButton></div></header>
    <div className="service-item-heading"><span>{record.maintenance_record_items.length} detailed items</span><DialogButton label="Add item"><form action={addMaintenanceRecordItem}><input type="hidden" name="vehicle_id" value={vehicleId} /><input type="hidden" name="maintenance_record_id" value={record.id} /><ItemFields /><button className="button primary">Add service item</button></form></DialogButton></div>
    {record.maintenance_record_items.length ? <div className="service-item-list">{record.maintenance_record_items.map((item) => <div className="service-item" key={item.id}><div><small>{item.category}{item.source_item_number ? ` · ITEM ${item.source_item_number}` : ""}</small><strong>{item.title}</strong><span>{item.details || "No details"}</span><em>{[item.quantity, item.status].filter(Boolean).join(" · ")}</em></div><b>{item.line_amount != null ? `$${Number(item.line_amount).toFixed(2)}` : "—"}</b><DialogButton label="Edit item"><form action={updateMaintenanceRecordItem}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="vehicle_id" value={vehicleId} /><input type="hidden" name="maintenance_record_id" value={record.id} /><ItemFields item={item} /><button className="button primary">Save service item</button></form></DialogButton></div>)}</div> : <p className="service-no-items">No detailed items yet.</p>}
  </article>)}</div>;
}
