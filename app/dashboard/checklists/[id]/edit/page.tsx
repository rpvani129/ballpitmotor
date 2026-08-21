import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChecklistTemplateForm from "../../ChecklistTemplateForm";

export default async function EditChecklistTemplatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string,string>> }) {
  const { id } = await params; const query = await searchParams; const supabase = await createClient();
  const { data: template } = await supabase.from("checklist_templates").select("id,name,checklist_template_items(id,label,position)").eq("id", id).single();
  if (!template) notFound();
  const items = [...template.checklist_template_items].sort((a,b) => a.position - b.position).map((item) => ({ id: item.id, label: item.label }));
  return <main className="dashboard-main"><Link className="back-link" href="/dashboard/checklists">← Checklist templates</Link>
    <section className="page-title compact-title"><p className="eyebrow">EDIT TEMPLATE</p><h1>{template.name}</h1><p>Changes apply when this template is used on future event checklists. Existing event copies do not change.</p></section>
    {query.error && <p className="alert">The checklist could not be saved. Confirm the name and items are unique and complete.</p>}
    <ChecklistTemplateForm templateId={template.id} initialName={template.name} initialItems={items} />
  </main>;
}
