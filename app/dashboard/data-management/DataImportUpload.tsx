"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DataImportUpload() {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function submit(formData: FormData) {
    setBusy(true); setMessage("");
    const response = await fetch("/api/data-management/import", { method: "POST", body: formData });
    const result = await response.json().catch(() => ({}));
    if (result.id) { router.push(`/dashboard/data-management/imports/${result.id}`); return; }
    setMessage(result.error || "The workbook could not be staged."); setBusy(false);
  }
  return <form className="data-import-form" action={submit}>
    <label>Grid workbook<input type="file" name="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required /></label>
    <p>Upload a workbook downloaded from this page. Nothing changes until you review and confirm.</p>
    <button className="button primary" disabled={busy}>{busy ? "Checking workbook…" : "Upload for review"}</button>
    {message && <p className="alert">{message}</p>}
  </form>;
}
