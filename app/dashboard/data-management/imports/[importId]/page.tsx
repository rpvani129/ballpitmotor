import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { commitDataManagementImport } from "../../actions";
import type { DataChange } from "@/lib/data-management";

export default async function ImportReviewPage({ params, searchParams }: { params: Promise<{ importId: string }>; searchParams: Promise<Record<string,string>> }) {
  const { importId } = await params; const query = await searchParams; const supabase = await createClient();
  const { data: imported } = await supabase.from("data_management_imports").select("*").eq("id", importId).single(); if (!imported) notFound();
  const changes = (imported.changes ?? []) as DataChange[]; const errors = (imported.errors ?? []) as { sheet: string; row: number; message: string }[]; const summary = imported.summary as { creates?: number; updates?: number; unchanged?: number; errors?: number };
  return <main className="dashboard-main"><Link className="back-link" href="/dashboard/data-management">← Back to Data Management</Link><section className="page-title compact-title"><p className="eyebrow">WORKBOOK REVIEW</p><h1>Check every change.</h1><p>{imported.file_name} · Nothing is saved until you confirm.</p></section>
    {query.error && <p className="alert">The workbook could not be committed. Re-export your data and try again.</p>}
    <section className="import-review-summary"><div><strong>{summary.creates ?? 0}</strong><span>New</span></div><div><strong>{summary.updates ?? 0}</strong><span>Updates</span></div><div><strong>{summary.unchanged ?? 0}</strong><span>Unchanged</span></div><div className={errors.length ? "warning" : "good"}><strong>{errors.length}</strong><span>Errors</span></div></section>
    {errors.length > 0 && <section className="import-errors"><h2>Fix before saving</h2>{errors.map((error, index) => <div key={index}><strong>{error.sheet} · Row {error.row}</strong><span>{error.message}</span></div>)}</section>}
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">STAGED CHANGES</p><h2>{changes.length} records</h2></div></div><div className="data-change-list">{changes.map((change) => <article key={`${change.entity}-${change.id}`}><span className={`change-badge ${change.operation}`}>{change.operation}</span><div><strong>{change.label}</strong><span>{change.entity.replaceAll("_", " ")} · {change.id}</span></div></article>)}{!changes.length && <div className="empty-state compact"><strong>No changes detected.</strong><p>The workbook matches the current Grid.</p></div>}</div></section>
    {imported.status === "review" && changes.length > 0 && errors.length === 0 && <form className="form-submit" action={commitDataManagementImport}><input type="hidden" name="import_id" value={importId} /><Link className="button ghost light" href="/dashboard/data-management">Cancel</Link><button className="button primary large">Confirm {changes.length} changes</button></form>}
    {imported.status === "committed" && <p className="success-message">This workbook has already been committed.</p>}
  </main>;
}
