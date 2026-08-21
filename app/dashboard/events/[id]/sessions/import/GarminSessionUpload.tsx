"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const accept = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
const mimeByExtension: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export default function GarminSessionUpload({ workspaceId, eventId }: { workspaceId: string; eventId: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [supabase] = useState(() => createClient());
  async function upload(formData: FormData) {
    const selected = formData.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (!selected.length || selected.length > 10) { setMessage("Choose between 1 and 10 screenshots."); return; }
    const prepared = selected.map((file) => ({ file, extension: file.name.split(".").pop()?.toLowerCase() || "" }));
    if (prepared.some(({ file, extension }) => !mimeByExtension[extension] || file.size > 20 * 1024 * 1024)) { setMessage("Use JPG, PNG, or WebP screenshots up to 20 MB each. Convert HEIC images first."); return; }
    setBusy(true); setMessage(`Uploading ${prepared.length} screenshot${prepared.length === 1 ? "" : "s"}…`);
    const uploaded: { storagePath: string; fileName: string; mimeType: string; fileSize: number }[] = [];
    for (const { file, extension } of prepared) {
      const storagePath = `${workspaceId}/${eventId}/${crypto.randomUUID()}.${extension}`; const mimeType = mimeByExtension[extension];
      const { error } = await supabase.storage.from("garmin-session-imports").upload(storagePath, file, { contentType: mimeType, upsert: false });
      if (error) { if (uploaded.length) await supabase.storage.from("garmin-session-imports").remove(uploaded.map((item) => item.storagePath)); setMessage(error.message); setBusy(false); return; }
      uploaded.push({ storagePath, fileName: file.name, mimeType, fileSize: file.size });
    }
    setMessage("Reading Garmin sessions… this can take up to a minute.");
    const response = await fetch("/api/session-imports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, files: uploaded }) });
    const result = await response.json().catch(() => ({}));
    if (result.id) { router.push(`/dashboard/events/${eventId}/sessions/import/${result.id}`); return; }
    await supabase.storage.from("garmin-session-imports").remove(uploaded.map((item) => item.storagePath));
    if (result.duplicateId) { router.push(`/dashboard/events/${eventId}/sessions/import/${result.duplicateId}?duplicate=1`); return; }
    setMessage(result.error || "The screenshots could not be processed."); setBusy(false);
  }
  return <form className="service-upload-panel" action={upload}>
    <label className="service-dropzone"><span>Choose Garmin screenshots</span><strong>1–10 JPG, PNG, or WebP images · 20 MB max each</strong><input name="files" type="file" accept={accept} multiple required disabled={busy} /></label>
    <div className="import-explainer"><strong>What happens next</strong><ol><li>The Grid reads the complete screenshot set and finds distinct sessions.</li><li>You review session numbers, start times, and best laps.</li><li>Nothing is added to the event until you confirm.</li></ol></div>
    <button className="button primary large" disabled={busy}>{busy ? "Processing…" : "Upload and review"}</button>{message && <p className="attachment-message" role="status">{message}</p>}
  </form>;
}
