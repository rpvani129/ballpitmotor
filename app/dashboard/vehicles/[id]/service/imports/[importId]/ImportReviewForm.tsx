"use client";

import { useState } from "react";
import Link from "next/link";
import { commitServiceRecordImport } from "@/app/actions";
import type { ExtractedServiceRecord } from "@/lib/service-record-extraction";

export default function ImportReviewForm({ vehicleId, importId, initial }: { vehicleId: string; importId: string; initial: ExtractedServiceRecord }) {
  const [draft, setDraft] = useState(initial);
  const update = (field: keyof ExtractedServiceRecord, value: unknown) => setDraft((current) => ({ ...current, [field]: value }));
  const updateItem = (index: number, field: string, value: unknown) => setDraft((current) => ({ ...current, items: current.items.map((item, position) => position === index ? { ...item, [field]: value } : item) }));
  const removeItem = (index: number) => setDraft((current) => ({ ...current, items: current.items.filter((_, position) => position !== index) }));
  const addItem = () => setDraft((current) => ({ ...current, items: [...current.items, { category: "Maintenance", title: "", details: null, quantity: null, line_amount: null, source_item_number: null, status: "Complete", confidence: 1 }] }));
  return <form action={commitServiceRecordImport} className="import-review-form">
    <input type="hidden" name="vehicle_id" value={vehicleId} /><input type="hidden" name="import_id" value={importId} /><input type="hidden" name="draft" value={JSON.stringify(draft)} />
    {draft.warnings.length > 0 && <div className="import-warnings"><strong>Review these items</strong>{draft.warnings.map((warning, index) => <p key={index}>{warning}</p>)}</div>}
    <section className="form-section"><div className="form-section-number">01</div><div className="form-section-copy"><p className="eyebrow">SERVICE RECORD</p><h2>Review the record</h2><p>Fields marked with an asterisk are required.</p></div><div className="form-grid">
      <label>Service date <span className="required-mark">*</span><input type="date" value={draft.service_date ?? ""} onChange={(event) => update("service_date", event.target.value)} required /></label>
      <label>Category <input value={draft.category} onChange={(event) => update("category", event.target.value)} /></label>
      <label className="span-2">Title <span className="required-mark">*</span><input value={draft.title} onChange={(event) => update("title", event.target.value)} required /></label>
      <label>Vendor <input value={draft.vendor ?? ""} onChange={(event) => update("vendor", event.target.value || null)} /></label>
      <label>Odometer <input type="number" min="0" value={draft.odometer_miles ?? ""} onChange={(event) => update("odometer_miles", event.target.value ? Number(event.target.value) : null)} /></label>
      <label>Total cost <input type="number" min="0" step="0.01" value={draft.cost ?? ""} onChange={(event) => update("cost", event.target.value ? Number(event.target.value) : null)} /></label>
      <label>Invoice / RO number <input value={draft.invoice_number ?? ""} onChange={(event) => update("invoice_number", event.target.value || null)} /></label>
      <label className="span-2">Summary <textarea value={draft.description ?? ""} onChange={(event) => update("description", event.target.value || null)} /></label>
    </div></section>
    <section className="form-section"><div className="form-section-number">02</div><div className="form-section-copy"><p className="eyebrow">DETAILED ITEMS</p><h2>Review extracted work</h2><p>Keep one row for each job you want in service history.</p></div><div className="import-item-stack">
      {draft.items.map((item, index) => <article className="import-item-card" key={index}><div className="import-item-title"><strong>Item {index + 1}</strong><button type="button" className="text-button danger-text" onClick={() => removeItem(index)}>Remove</button></div><div className="form-grid">
        <label>Title <span className="required-mark">*</span><input value={item.title} onChange={(event) => updateItem(index, "title", event.target.value)} required /></label><label>Category <input value={item.category} onChange={(event) => updateItem(index, "category", event.target.value)} /></label>
        <label>Quantity <input value={item.quantity ?? ""} onChange={(event) => updateItem(index, "quantity", event.target.value || null)} /></label><label>Amount <input type="number" min="0" step="0.01" value={item.line_amount ?? ""} onChange={(event) => updateItem(index, "line_amount", event.target.value ? Number(event.target.value) : null)} /></label>
        <label className="span-2">Details <textarea value={item.details ?? ""} onChange={(event) => updateItem(index, "details", event.target.value || null)} /></label>
      </div></article>)}
      <button className="button outline" type="button" onClick={addItem}>+ Add item</button>
    </div></section>
    <div className="form-submit"><Link className="button ghost light" href={`/dashboard/vehicles/${vehicleId}`}>Cancel</Link><button className="button primary large">Confirm and add to history</button></div>
  </form>;
}
