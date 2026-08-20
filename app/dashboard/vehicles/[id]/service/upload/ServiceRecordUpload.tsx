"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const accept = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";
const mimeByExtension: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export default function ServiceRecordUpload({ workspaceId, vehicleId }: { workspaceId: string; vehicleId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [supabase] = useState(() => createClient());
  async function upload(formData: FormData) {
    const file = formData.get("file") as File | null;
    if (!file?.size) return;
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const mimeType = mimeByExtension[extension];
    if (!mimeType) { setMessage("Choose a PDF, JPG, PNG, or WebP file. Convert HEIC photos before uploading."); return; }
    if (file.size > 20 * 1024 * 1024) { setMessage("Files must be 20 MB or smaller."); return; }
    setBusy(true); setMessage("Uploading securely…");
    const path = `${workspaceId}/${vehicleId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("service-record-imports").upload(path, file, { contentType: mimeType, upsert: false });
    if (uploadError) { setMessage(uploadError.message); setBusy(false); return; }
    setMessage("Reading the service record… this can take up to a minute.");
    const response = await fetch("/api/service-record-imports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vehicleId, storagePath: path, fileName: file.name, mimeType, fileSize: file.size }) });
    const result = await response.json().catch(() => ({}));
    if (result.id) { router.push(`/dashboard/vehicles/${vehicleId}/service/imports/${result.id}`); return; }
    await supabase.storage.from("service-record-imports").remove([path]);
    setMessage(result.error || "The document could not be processed."); setBusy(false);
  }
  return <form className="service-upload-panel" action={upload}>
    <label className="service-dropzone"><span>Choose a service document</span><strong>PDF, JPG, PNG, or WebP · 20 MB max</strong><input name="file" type="file" accept={accept} required disabled={busy} /></label>
    <div className="import-explainer"><strong>What happens next</strong><ol><li>The document is sent securely to the extraction service and read into a draft.</li><li>You review every field and line item.</li><li>Nothing is saved to service history until you confirm.</li></ol></div>
    <button className="button primary large" disabled={busy}>{busy ? "Processing…" : "Upload and review"}</button>
    {message && <p className="attachment-message" role="status">{message}</p>}
  </form>;
}
