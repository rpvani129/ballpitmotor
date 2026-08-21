import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteChecklistTemplate } from "@/app/actions";
import DeleteRecordButton from "../DeleteRecordButton";

type Template = { id: string; name: string; checklist_template_items: { id: string }[]; checklist_runs: { id: string }[] };

export default async function ChecklistTemplatesPage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const query = await searchParams; const supabase = await createClient();
  const { data: templates } = await supabase.from("checklist_templates")
    .select("id,name,checklist_template_items(id),checklist_runs(id)").eq("is_active", true).order("name");
  const rows = (templates ?? []) as Template[];
  return <main className="dashboard-main">
    <section className="page-title action-title"><div><p className="eyebrow">WORKSPACE SETUP</p><h1>Checklists</h1><p>Build reusable lists, then start a fresh incomplete copy from any event.</p></div><Link className="button primary" href="/dashboard/checklists/new">+ Add checklist</Link></section>
    {query.saved && <p className="success-message">Checklist template {query.saved}.</p>}{query.deleted && <p className="success-message">Checklist template deleted.</p>}
    {query.error === "used" && <p className="alert">That template is already used by an event checklist and cannot be deleted. You can still edit it for future checklists.</p>}
    {query.error && query.error !== "used" && <p className="alert">That checklist template could not be deleted.</p>}
    <section className="checklist-template-grid">{rows.map((template) => <article className="checklist-template-card" key={template.id}>
      <div><p className="eyebrow">CHECKLIST TEMPLATE</p><h2>{template.name}</h2><p>{template.checklist_template_items.length} items · Used on {template.checklist_runs.length} event checklist{template.checklist_runs.length === 1 ? "" : "s"}</p></div>
      <div className="record-actions"><Link className="button dark compact-button" href={`/dashboard/checklists/${template.id}/edit`}>Edit</Link><DeleteRecordButton action={deleteChecklistTemplate} fields={{ template_id: template.id }} confirmMessage={`Delete ${template.name}? This is allowed only when it has not been used on an event.`} /></div>
    </article>)}</section>
    {!rows.length && <div className="empty-state"><strong>No checklist templates yet.</strong><p>Add a reusable checklist before creating an event checklist.</p></div>}
  </main>;
}
