import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DataImportUpload from "./DataImportUpload";

export default async function DataManagementPage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const query = await searchParams; const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/login");
  const { data: membership } = await supabase.from("memberships").select("workspace_id").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle(); if (!membership) redirect("/dashboard");
  const [{ count: vehicleCount }, { count: eventCount }, { count: sessionCount }, { data: imports }, { data: reviews }] = await Promise.all([
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("workspace_id", membership.workspace_id),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("workspace_id", membership.workspace_id),
    supabase.from("sessions").select("id", { count: "exact", head: true }).eq("workspace_id", membership.workspace_id),
    supabase.from("data_management_imports").select("id,file_name,status,summary,created_at,committed_at").eq("workspace_id", membership.workspace_id).order("created_at", { ascending: false }).limit(10),
    supabase.from("data_quality_reviews").select("issue_key").eq("workspace_id", membership.workspace_id),
  ]);
  return <main className="dashboard-main data-management-page">
    <section className="page-hero compact"><div><p className="eyebrow">CONTROL + RECONCILIATION</p><h1>Data Management.</h1><p className="lede dark">Export your Grid, make controlled mass updates, and keep incomplete records visible.</p></div><Link className="button outline" href="/dashboard/data-management/quality">Data quality</Link></section>
    {query.imported && <p className="success-message">Workbook changes were applied successfully.</p>}
    <section className="data-management-summary"><div><strong>{vehicleCount ?? 0}</strong><span>Vehicles</span></div><div><strong>{eventCount ?? 0}</strong><span>Events</span></div><div><strong>{sessionCount ?? 0}</strong><span>Sessions</span></div><div><strong>{reviews?.length ?? 0}</strong><span>Resolved quality items</span></div></section>
    <section className="data-management-grid">
      <article className="data-management-card"><p className="eyebrow">01 · DOWNLOAD</p><h2>Export your Grid</h2><p>Download setup and historical records in one Excel workbook. Editable sheets retain Grid IDs and conflict snapshots.</p><a className="button primary" href="/api/data-management/export">Download Excel workbook</a></article>
      <article className="data-management-card"><p className="eyebrow">02 · REVIEW</p><h2>Upload mass updates</h2><DataImportUpload /></article>
      <article className="data-management-card"><p className="eyebrow">03 · RECONCILE</p><h2>Data quality</h2><p>Find missing assignments, incomplete weather, untimed sessions, and potential duplicates.</p><Link className="button outline" href="/dashboard/data-management/quality">Open data quality</Link></article>
    </section>
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">ACTIVITY</p><h2>Recent imports</h2></div></div><div className="import-activity-list">{(imports ?? []).map((item) => <Link href={`/dashboard/data-management/imports/${item.id}`} key={item.id}><div><strong>{item.file_name}</strong><span>{new Date(item.created_at).toLocaleString()} · {item.status}</span></div><span>{String((item.summary as { creates?: number })?.creates ?? 0)} new · {String((item.summary as { updates?: number })?.updates ?? 0)} updates</span></Link>)}{!imports?.length && <div className="empty-state compact"><strong>No workbook imports yet.</strong><p>Your staged and completed updates will appear here.</p></div>}</div></section>
  </main>;
}
