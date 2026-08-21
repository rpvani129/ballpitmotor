import Link from "next/link";
import { notFound } from "next/navigation";
import { startChecklist } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

export default async function NewEventChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const supabase = await createClient();
  const [{ data: event }, { data: templates }] = await Promise.all([
    supabase.from("events").select("id,event_name,business_id,vehicle_id").eq("id", id).single(),
    supabase.from("checklist_templates").select("id,name,checklist_template_items(id)").eq("is_active", true).order("name"),
  ]);
  if (!event) notFound();
  return <main className="dashboard-main"><Link className="back-link" href={`/dashboard/events/${id}?tab=checklist`}>← Back to event</Link>
    <section className="page-title compact-title"><p className="eyebrow">{event.business_id} · NEW CHECKLIST</p><h1>Add checklist.</h1><p>Select a template. The Grid will create a fresh event copy with every item incomplete.</p></section>
    {templates?.length ? <form className="record-form compact-form" action={startChecklist}>
      <input type="hidden" name="event_id" value={event.id} /><input type="hidden" name="vehicle_id" value={event.vehicle_id ?? ""} />
      <label>Checklist type <span className="required-mark">*</span><select name="template_id" required defaultValue=""><option value="" disabled>Select a checklist</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name} · {template.checklist_template_items.length} items</option>)}</select></label>
      <div className="form-submit"><Link className="button ghost light" href={`/dashboard/events/${id}?tab=checklist`}>Cancel</Link><button className="button primary large">Start checklist</button></div>
    </form> : <div className="empty-state"><strong>No checklist templates available.</strong><p>Create a template first, then return to this event.</p><Link className="button primary" href="/dashboard/checklists/new">Add checklist template</Link></div>}
  </main>;
}
