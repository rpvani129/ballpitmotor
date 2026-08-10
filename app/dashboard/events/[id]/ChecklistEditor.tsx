"use client";

import { useState } from "react";
import { saveChecklist } from "@/app/actions";

type ChecklistItem = { id: string; label: string; checked: boolean };

export default function ChecklistEditor({ eventId, runId, initialItems }: { eventId: string; runId: string; initialItems: ChecklistItem[] }) {
  const [items, setItems] = useState(initialItems);

  const addItem = () => setItems((current) => [...current, { id: crypto.randomUUID(), label: "", checked: false }]);
  const updateItem = (id: string, changes: Partial<ChecklistItem>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
  const removeItem = (id: string) => setItems((current) => current.filter((item) => item.id !== id));

  return (
    <form className="checklist-editor" action={saveChecklist}>
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="run_id" value={runId} />
      <input type="hidden" name="items_json" value={JSON.stringify(items)} />
      <div className="checklist-editor-list">
        {items.map((item, index) => (
          <div className="checklist-editor-row" key={item.id}>
            <input aria-label={`Complete item ${index + 1}`} className="checklist-toggle" type="checkbox" checked={item.checked} onChange={(event) => updateItem(item.id, { checked: event.target.checked })} />
            <input aria-label={`Checklist item ${index + 1}`} value={item.label} onChange={(event) => updateItem(item.id, { label: event.target.value })} placeholder="Checklist item" required />
            <button aria-label={`Delete item ${index + 1}`} className="checklist-remove" type="button" onClick={() => removeItem(item.id)}>Remove</button>
          </div>
        ))}
      </div>
      <button className="button ghost checklist-add" type="button" onClick={addItem}>+ Add checklist item</button>
      <div className="checklist-actions">
        <button className="button dark" name="intent" value="save">Save checklist</button>
        <button className="button ghost" name="make_template" value="true">Save as standard template</button>
        <button className="button primary" name="intent" value="complete">Save + mark complete</button>
      </div>
      <p className="form-note checklist-note">Saving as the standard template replaces the checklist used when future events start a checklist. This event keeps its own editable copy.</p>
    </form>
  );
}
