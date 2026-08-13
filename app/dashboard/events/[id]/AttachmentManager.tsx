"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ATTACHMENT_ACCEPT, uploadFileDetails } from "@/lib/attachment-files";

type Attachment = { id: string; storage_path: string; file_name: string; mime_type: string; file_size_bytes: number; attachment_type: string; caption: string | null; created_at: string };

export default function AttachmentManager({ workspaceId, eventId, initialAttachments }: { workspaceId: string; eventId: string; initialAttachments: Attachment[] }) {
  const [attachments, setAttachments] = useState(initialAttachments);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [supabase] = useState(() => createClient());

  useEffect(() => { let active = true; Promise.all(attachments.map(async (item) => {
    const { data } = await supabase.storage.from("event-attachments").createSignedUrl(item.storage_path, 3600);
    return [item.id, data?.signedUrl ?? ""] as const;
  })).then((entries) => { if (active) setUrls(Object.fromEntries(entries)); }); return () => { active = false; }; }, [attachments, supabase]);

  const upload = async (formData: FormData) => {
    const file = formData.get("file") as File | null;
    if (!file || !file.size) return;
    if (file.size > 25 * 1024 * 1024) { setMessage("Files must be 25 MB or smaller."); return; }
    const fileDetails = uploadFileDetails(file);
    if (!fileDetails) { setMessage("Choose a JPG, JPEG, HEIC, PNG, WebP, PDF, or CSV file."); return; }
    setBusy(true); setMessage("");
    const path = `${workspaceId}/${eventId}/${crypto.randomUUID()}${fileDetails.extension}`;
    const { error: uploadError } = await supabase.storage.from("event-attachments").upload(path, file, { contentType: fileDetails.mimeType, upsert: false });
    if (uploadError) { setMessage(uploadError.message); setBusy(false); return; }
    const { data, error } = await supabase.from("event_attachments").insert({ workspace_id: workspaceId, event_id: eventId, storage_path: path, file_name: file.name, mime_type: fileDetails.mimeType, file_size_bytes: file.size, attachment_type: String(formData.get("attachment_type") ?? "Other"), caption: String(formData.get("caption") ?? "").trim() || null, uploaded_by: (await supabase.auth.getUser()).data.user?.id }).select("*").single();
    if (error || !data) { await supabase.storage.from("event-attachments").remove([path]); setMessage(error?.message ?? "Upload could not be saved."); } else { setAttachments((current) => [data, ...current]); setMessage("Attachment uploaded."); }
    setBusy(false);
  };

  const remove = async (item: Attachment) => {
    if (!window.confirm(`Delete ${item.file_name}?`)) return;
    setBusy(true); setMessage("");
    const { error: storageError } = await supabase.storage.from("event-attachments").remove([item.storage_path]);
    if (storageError) { setMessage(storageError.message); setBusy(false); return; }
    const { error } = await supabase.from("event_attachments").delete().eq("id", item.id).eq("event_id", eventId);
    if (error) setMessage("The file was removed, but its record could not be cleared."); else setAttachments((current) => current.filter((attachment) => attachment.id !== item.id));
    setBusy(false);
  };

  return <div className="attachment-manager">
    <form className="attachment-upload" action={upload}><label>File<input name="file" type="file" accept={ATTACHMENT_ACCEPT} required /></label><label>Type<select name="attachment_type" defaultValue="Photo"><option>Garmin Screenshot</option><option>Photo</option><option>Setup Sheet</option><option>Receipt</option><option>Document</option><option>Other</option></select></label><label className="span-2">Caption<input name="caption" maxLength={500} placeholder="Optional description" /></label><button className="button primary" disabled={busy}>{busy ? "Working…" : "Upload attachment"}</button></form>
    {message && <p className="attachment-message">{message}</p>}
    {attachments.length ? <div className="attachment-grid">{attachments.map((item) => <article className="attachment-card" key={item.id}>{item.mime_type.startsWith("image/") && urls[item.id] ? <img /* eslint-disable-line @next/next/no-img-element */ src={urls[item.id]} alt={item.caption || item.file_name} /> : <div className="attachment-file-icon">{item.mime_type === "application/pdf" ? "PDF" : "FILE"}</div>}<div><span>{item.attachment_type}</span><strong>{item.file_name}</strong><p>{item.caption || "No caption"}</p><small>{(item.file_size_bytes / 1024 / 1024).toFixed(1)} MB · {new Date(item.created_at).toLocaleDateString()}</small><div className="attachment-actions">{urls[item.id] && <a className="button outline compact-button" href={urls[item.id]} target="_blank" rel="noreferrer">View</a>}<button className="button ghost compact-button" disabled={busy} onClick={() => remove(item)}>Delete</button></div></div></article>)}</div> : <div className="empty-state"><strong>No attachments yet.</strong><p>Upload Garmin screenshots, photos, receipts, setup sheets, or supporting documents.</p></div>}
  </div>;
}
