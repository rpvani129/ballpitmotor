"use client";

import { useEffect, useState } from "react";
import { saveChecklist } from "@/app/actions";
import { ATTACHMENT_ACCEPT, uploadFileDetails } from "@/lib/attachment-files";
import { createClient } from "@/lib/supabase/client";

type ChecklistItem = { id: string; label: string; checked: boolean; note: string };
type ChecklistAttachment = { id: string; checklist_item_key: string; storage_path: string; file_name: string; mime_type: string; file_size_bytes: number };

export default function ChecklistEditor({ workspaceId, eventId, runId, initialItems, initialAttachments }: { workspaceId: string; eventId: string; runId: string; initialItems: ChecklistItem[]; initialAttachments: ChecklistAttachment[] }) {
  const [items, setItems] = useState(initialItems);
  const [attachments, setAttachments] = useState(initialAttachments);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [supabase] = useState(() => createClient());

  useEffect(() => { let active = true; Promise.all(attachments.map(async (item) => {
    const { data } = await supabase.storage.from("event-attachments").createSignedUrl(item.storage_path, 3600);
    return [item.id, data?.signedUrl ?? ""] as const;
  })).then((entries) => { if (active) setUrls(Object.fromEntries(entries)); }); return () => { active = false; }; }, [attachments, supabase]);

  const addItem = () => setItems((current) => [...current, { id: crypto.randomUUID(), label: "", checked: false, note: "" }]);
  const updateItem = (id: string, changes: Partial<ChecklistItem>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
  const removeItem = (id: string) => {
    if (attachments.some((attachment) => attachment.checklist_item_key === id)) { setMessage("Delete this checklist item's attachments before removing the item."); return; }
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const uploadEvidence = async (itemId: string, file: File | null) => {
    if (!file?.size) return;
    if (file.size > 25 * 1024 * 1024) { setMessage("Files must be 25 MB or smaller."); return; }
    const fileDetails = uploadFileDetails(file);
    if (!fileDetails) { setMessage("Choose a JPG, JPEG, HEIC, PNG, WebP, PDF, or CSV file."); return; }
    setBusyItem(itemId); setMessage("");
    const path = `${workspaceId}/${eventId}/checklist/${runId}/${itemId}/${crypto.randomUUID()}${fileDetails.extension}`;
    const { error: uploadError } = await supabase.storage.from("event-attachments").upload(path, file, { contentType: fileDetails.mimeType, upsert: false });
    if (uploadError) { setMessage(uploadError.message); setBusyItem(null); return; }
    const { data: authData } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("checklist_item_attachments").insert({ workspace_id: workspaceId, event_id: eventId, checklist_run_id: runId, checklist_item_key: itemId, storage_path: path, file_name: file.name, mime_type: fileDetails.mimeType, file_size_bytes: file.size, uploaded_by: authData.user?.id }).select("id,checklist_item_key,storage_path,file_name,mime_type,file_size_bytes").single();
    if (error || !data) { await supabase.storage.from("event-attachments").remove([path]); setMessage(error?.message ?? "Attachment could not be saved."); } else { setAttachments((current) => [...current, data]); setMessage("Checklist attachment uploaded."); }
    setBusyItem(null);
  };

  const removeEvidence = async (item: ChecklistAttachment) => {
    if (!window.confirm(`Delete ${item.file_name}?`)) return;
    setBusyItem(item.checklist_item_key); setMessage("");
    const { error: storageError } = await supabase.storage.from("event-attachments").remove([item.storage_path]);
    if (storageError) { setMessage(storageError.message); setBusyItem(null); return; }
    const { error } = await supabase.from("checklist_item_attachments").delete().eq("id", item.id).eq("checklist_run_id", runId);
    if (error) setMessage("The file was removed, but its record could not be cleared."); else setAttachments((current) => current.filter((attachment) => attachment.id !== item.id));
    setBusyItem(null);
  };

  return (
    <form className="checklist-editor" action={saveChecklist}>
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="run_id" value={runId} />
      <input type="hidden" name="items_json" value={JSON.stringify(items)} />
      <div className="checklist-editor-list">
        {items.map((item, index) => (
          <div className="checklist-editor-row" key={item.id}>
            <input aria-label={`Complete item ${index + 1}`} className="checklist-toggle" type="checkbox" checked={item.checked} onChange={(event) => updateItem(item.id, { checked: event.target.checked })} />
            <div className="checklist-item-fields">
              <input aria-label={`Checklist item ${index + 1}`} value={item.label} onChange={(event) => updateItem(item.id, { label: event.target.value })} placeholder="Checklist item" required />
              <textarea aria-label={`Notes for checklist item ${index + 1}`} value={item.note} onChange={(event) => updateItem(item.id, { note: event.target.value })} maxLength={2000} rows={2} placeholder="Optional notes" />
              <div className="checklist-evidence">
                {attachments.filter((attachment) => attachment.checklist_item_key === item.id).map((attachment) => <span key={attachment.id}>{urls[attachment.id] ? <a href={urls[attachment.id]} target="_blank" rel="noreferrer">{attachment.file_name}</a> : attachment.file_name}<button type="button" disabled={busyItem === item.id} onClick={() => removeEvidence(attachment)}>×</button></span>)}
                <label>{busyItem === item.id ? "Uploading…" : "+ Add attachment"}<input type="file" accept={ATTACHMENT_ACCEPT} disabled={busyItem === item.id} onChange={(event) => { void uploadEvidence(item.id, event.target.files?.[0] ?? null); event.target.value = ""; }} /></label>
              </div>
            </div>
            <button aria-label={`Delete item ${index + 1}`} className="checklist-remove" type="button" onClick={() => removeItem(item.id)}>Remove</button>
          </div>
        ))}
      </div>
      {message && <p className="attachment-message">{message}</p>}
      <button className="button ghost checklist-add" type="button" onClick={addItem}>+ Add checklist item</button>
      <div className="checklist-actions">
        <button className="button dark" name="intent" value="save">Save checklist</button>
        <button className="button primary" name="intent" value="complete">Save + mark complete</button>
      </div>
      <p className="form-note checklist-note">Changes here apply only to this event checklist. Manage reusable templates from the Checklist menu.</p>
    </form>
  );
}
