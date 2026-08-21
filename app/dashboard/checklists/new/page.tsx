import Link from "next/link";
import ChecklistTemplateForm from "../ChecklistTemplateForm";

export default async function NewChecklistTemplatePage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const query = await searchParams;
  return <main className="dashboard-main"><Link className="back-link" href="/dashboard/checklists">← Checklist templates</Link>
    <section className="page-title compact-title"><p className="eyebrow">NEW TEMPLATE</p><h1>Add checklist.</h1><p>Create a reusable checklist that can be started from any event.</p></section>
    {query.error && <p className="alert">Add a name and at least one checklist item.</p>}<ChecklistTemplateForm />
  </main>;
}
