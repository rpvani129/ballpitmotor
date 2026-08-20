"use client";

import { useState } from "react";
import Link from "next/link";
import { commitServiceRecordImport } from "@/app/actions";
import type { ExtractedServiceDocument, ExtractedServiceItem, ExtractedServiceRecord } from "@/lib/service-record-extraction";

const blankItem = (): ExtractedServiceItem => ({ category: "Maintenance", title: "", details: null, quantity: null, line_amount: null, source_item_number: null, status: "Complete", confidence: 1 });
const blankRecord = (): ExtractedServiceRecord => ({ service_date: null, category: "Maintenance", title: "", description: null, odometer_miles: null, vendor: null, cost: null, invoice_number: null, confidence: 1, warnings: [], items: [blankItem()] });

export default function ImportReviewForm({ vehicleId, importId, initial }: { vehicleId: string; importId: string; initial: ExtractedServiceDocument }) {
  const [draft, setDraft] = useState(initial);
  const updateRecord = (recordIndex: number, field: keyof ExtractedServiceRecord, value: unknown) => setDraft((current) => ({ ...current, records: current.records.map((record, position) => position === recordIndex ? { ...record, [field]: value } : record) }));
  const updateItem = (recordIndex: number, itemIndex: number, field: keyof ExtractedServiceItem, value: unknown) => setDraft((current) => ({ ...current, records: current.records.map((record, position) => position === recordIndex ? { ...record, items: record.items.map((item, itemPosition) => itemPosition === itemIndex ? { ...item, [field]: value } : item) } : record) }));
  const removeItem = (recordIndex: number, itemIndex: number) => setDraft((current) => ({ ...current, records: current.records.map((record, position) => position === recordIndex ? { ...record, items: record.items.filter((_, itemPosition) => itemPosition !== itemIndex) } : record) }));
  const addItem = (recordIndex: number) => setDraft((current) => ({ ...current, records: current.records.map((record, position) => position === recordIndex ? { ...record, items: [...record.items, blankItem()] } : record) }));
  const removeRecord = (recordIndex: number) => setDraft((current) => ({ ...current, records: current.records.filter((_, position) => position !== recordIndex) }));

  return <form action={commitServiceRecordImport} className="import-review-form">
    <input type="hidden" name="vehicle_id" value={vehicleId} /><input type="hidden" name="import_id" value={importId} /><input type="hidden" name="draft" value={JSON.stringify(draft)} />
    {draft.warnings.length > 0 && <div className="import-warnings"><strong>Document notes</strong>{draft.warnings.map((warning, index) => <p key={index}>{warning}</p>)}</div>}
    <div className="import-record-summary"><strong>{draft.records.length} service record{draft.records.length === 1 ? "" : "s"} found</strong><span>Separate invoices and service dates can be reviewed and saved together.</span></div>
    {draft.records.map((record, recordIndex) => <section className="import-record" key={recordIndex}>
      <div className="import-record-heading"><div><p className="eyebrow">SERVICE RECORD {recordIndex + 1}</p><h2>{record.title || "Untitled service"}</h2></div>{draft.records.length > 1 && <button type="button" className="text-button danger-text" onClick={() => removeRecord(recordIndex)}>Remove record</button>}</div>
      {record.warnings.length > 0 && <div className="import-warnings compact"><strong>Review this record</strong>{record.warnings.map((warning, index) => <p key={index}>{warning}</p>)}</div>}
      <section className="form-section"><div className="form-section-number">01</div><div className="form-section-copy"><p className="eyebrow">SERVICE RECORD</p><h2>Review the record</h2><p>Fields marked with an asterisk are required.</p></div><div className="form-grid">
        <label>Service date <span className="required-mark">*</span><input type="date" value={record.service_date ?? ""} onChange={(event) => updateRecord(recordIndex, "service_date", event.target.value)} required /></label>
        <label>Category <input value={record.category} onChange={(event) => updateRecord(recordIndex, "category", event.target.value)} /></label>
        <label className="span-2">Title <span className="required-mark">*</span><input value={record.title} onChange={(event) => updateRecord(recordIndex, "title", event.target.value)} required /></label>
        <label>Vendor <input value={record.vendor ?? ""} onChange={(event) => updateRecord(recordIndex, "vendor", event.target.value || null)} /></label>
        <label>Odometer <input type="number" min="0" value={record.odometer_miles ?? ""} onChange={(event) => updateRecord(recordIndex, "odometer_miles", event.target.value ? Number(event.target.value) : null)} /></label>
        <label>Total cost <input type="number" min="0" step="0.01" value={record.cost ?? ""} onChange={(event) => updateRecord(recordIndex, "cost", event.target.value ? Number(event.target.value) : null)} /></label>
        <label>Invoice / RO number <input value={record.invoice_number ?? ""} onChange={(event) => updateRecord(recordIndex, "invoice_number", event.target.value || null)} /></label>
        <label className="span-2">Summary <textarea value={record.description ?? ""} onChange={(event) => updateRecord(recordIndex, "description", event.target.value || null)} /></label>
      </div></section>
      <section className="form-section"><div className="form-section-number">02</div><div className="form-section-copy"><p className="eyebrow">DETAILED ITEMS</p><h2>Review extracted work</h2><p>Keep one row for each job you want in service history.</p></div><div className="import-item-stack">
        {record.items.map((item, itemIndex) => <article className="import-item-card" key={itemIndex}><div className="import-item-title"><strong>Item {itemIndex + 1}</strong><button type="button" className="text-button danger-text" onClick={() => removeItem(recordIndex, itemIndex)}>Remove</button></div><div className="form-grid">
          <label>Title <span className="required-mark">*</span><input value={item.title} onChange={(event) => updateItem(recordIndex, itemIndex, "title", event.target.value)} required /></label><label>Category <input value={item.category} onChange={(event) => updateItem(recordIndex, itemIndex, "category", event.target.value)} /></label>
          <label>Quantity <input value={item.quantity ?? ""} onChange={(event) => updateItem(recordIndex, itemIndex, "quantity", event.target.value || null)} /></label><label>Amount <input type="number" min="0" step="0.01" value={item.line_amount ?? ""} onChange={(event) => updateItem(recordIndex, itemIndex, "line_amount", event.target.value ? Number(event.target.value) : null)} /></label>
          <label className="span-2">Details <textarea value={item.details ?? ""} onChange={(event) => updateItem(recordIndex, itemIndex, "details", event.target.value || null)} /></label>
        </div></article>)}
        <button className="button outline" type="button" onClick={() => addItem(recordIndex)}>+ Add item</button>
      </div></section>
    </section>)}
    <button className="button outline" type="button" onClick={() => setDraft((current) => ({ ...current, records: [...current.records, blankRecord()] }))}>+ Add another service record</button>
    <div className="form-submit"><Link className="button ghost light" href={`/dashboard/vehicles/${vehicleId}`}>Cancel</Link><button className="button primary large" disabled={!draft.records.length}>Confirm and add {draft.records.length === 1 ? "record" : `${draft.records.length} records`}</button></div>
  </form>;
}
