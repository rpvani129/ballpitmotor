import Link from "next/link";

type ServiceItem = { id: string; category: string; title: string; details: string | null; quantity: string | null; line_amount: number | null; source_item_number: string | null; status: string; };

export default function ServiceItemForm({ vehicleId, recordId, item, action }: { vehicleId: string; recordId: string; item?: ServiceItem; action: (formData: FormData) => void | Promise<void> }) {
  return <form className="event-form record-form" action={action}><input type="hidden" name="vehicle_id" value={vehicleId} /><input type="hidden" name="maintenance_record_id" value={recordId} />{item && <input type="hidden" name="id" value={item.id} />}
    <section className="form-section"><div className="form-section-number">01</div><div className="form-section-copy"><p className="eyebrow">SERVICE ITEM</p><h2>{item ? "Edit item" : "Add item"}</h2></div><div className="form-grid">
      <label>Category<input name="category" defaultValue={item?.category ?? "Maintenance"} required /></label><label>Status<select name="status" defaultValue={item?.status ?? "Complete"}><option>Complete</option><option>In Progress</option><option>Deferred</option><option>Cancelled</option></select></label>
      <label className="span-2">Work performed<input name="title" defaultValue={item?.title ?? ""} required /></label><label className="span-2">Details / parts<textarea name="details" rows={4} defaultValue={item?.details ?? ""} /></label>
      <label>Quantity<input name="quantity" defaultValue={item?.quantity ?? ""} /></label><label>Line amount<input name="line_amount" type="number" min="0" step="0.01" defaultValue={item?.line_amount ?? ""} /></label><label>Source item #<input name="source_item_number" defaultValue={item?.source_item_number ?? ""} /></label>
    </div></section><div className="form-submit"><Link className="button ghost light" href={`/dashboard/vehicles/${vehicleId}`}>Cancel</Link><button className="button primary large">{item ? "Save service item" : "Add service item"}</button></div>
  </form>;
}
