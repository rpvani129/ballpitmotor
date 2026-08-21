"use client";

import Link from "next/link";
import { useState } from "react";
import { saveChecklistTemplate } from "@/app/actions";

type TemplateItem = { id: string; label: string };

export default function ChecklistTemplateForm({ templateId, initialName = "", initialItems = [] }: { templateId?: string; initialName?: string; initialItems?: TemplateItem[] }) {
  const [items, setItems] = useState<TemplateItem[]>(initialItems.length ? initialItems : [{ id: crypto.randomUUID(), label: "" }]);
  const updateItem = (id: string, label: string) => setItems((current) => current.map((item) => item.id === id ? { ...item, label } : item));
  const removeItem = (id: string) => setItems((current) => current.filter((item) => item.id !== id));
  const addItem = () => setItems((current) => [...current, { id: crypto.randomUUID(), label: "" }]);

  return <form className="record-form checklist-template-form" action={saveChecklistTemplate}>
    {templateId && <input type="hidden" name="template_id" value={templateId} />}
    <input type="hidden" name="items_json" value={JSON.stringify(items)} />
    <label>Checklist name <span className="required-mark">*</span><input name="name" defaultValue={initialName} maxLength={120} placeholder="Example: Race Day Packing List" required /></label>
    <section className="template-item-builder">
      <div className="section-heading"><div><p className="eyebrow">TEMPLATE ITEMS</p><h2>Checklist items</h2></div><span>{items.length} items</span></div>
      <div className="template-item-list">{items.map((item, index) => <div className="template-item-row" key={item.id}>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <input aria-label={`Checklist item ${index + 1}`} value={item.label} onChange={(event) => updateItem(item.id, event.target.value)} maxLength={240} placeholder="Enter checklist item" required />
        <button className="checklist-remove" type="button" onClick={() => removeItem(item.id)} disabled={items.length === 1}>Remove</button>
      </div>)}</div>
      <button className="button outline" type="button" onClick={addItem}>+ Add item</button>
    </section>
    <div className="form-submit"><Link className="button ghost light" href="/dashboard/checklists">Cancel</Link><button className="button primary large">Save checklist template</button></div>
  </form>;
}
