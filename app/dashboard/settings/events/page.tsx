import Link from "next/link";
import { redirect } from "next/navigation";
import { addEventNoteCategory, deleteEventNoteCategory, updateEventSettings } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

export default async function EventSettingsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: membership } = await supabase.from("memberships").select("workspace_id,workspaces(name,slug)").eq("user_id", user!.id).eq("status", "active").limit(1).single();
  if (!membership) redirect("/dashboard");
  const [{ data: settings }, { data: categories }] = await Promise.all([
    supabase.from("event_settings").select("show_public_events").eq("workspace_id", membership.workspace_id).maybeSingle(),
    supabase.from("event_note_categories").select("name,event_notes(count)").eq("workspace_id", membership.workspace_id).order("name"),
  ]);
  const workspace = membership.workspaces as unknown as { name: string; slug: string };
  const publicUrl = `/events/${workspace.slug}`;
  return <main className="dashboard-main">
    <Link className="back-link" href="/dashboard">← Events</Link>
    <section className="page-title"><p className="eyebrow">EVENT SETTINGS</p><h1>Control the public grid.</h1><p>Choose what visitors can see and manage the categories used by your event journal.</p></section>
    {query.saved && <p className="success-message">Event settings saved.</p>}
    {query.error && <p className="alert">{query.error === "category_in_use" ? "That category is assigned to an existing note and cannot be deleted." : "That change could not be saved."}</p>}
    <section className="settings-stack">
      <form className="settings-card" action={updateEventSettings}>
        <div><p className="eyebrow">PUBLIC EVENT VIEW</p><h2>Show events and lap-time details</h2><p>Publishes a read-only event index and event pages. Notes, checklists, and attachments remain private. Weather and tire/pad setup are visible.</p></div>
        <label className="setting-toggle"><input type="checkbox" name="show_public_events" value="true" defaultChecked={settings?.show_public_events ?? false} /><span>Public event pages enabled</span></label>
        <div className="settings-actions"><button className="button primary">Save visibility</button>{settings?.show_public_events && <Link className="button ghost" href={publicUrl} target="_blank">View public site ↗</Link>}</div>
      </form>
      <section className="settings-card">
        <div><p className="eyebrow">EVENT JOURNAL</p><h2>Note categories</h2><p>Add categories for future notes. A category can only be deleted when no existing note uses it.</p></div>
        <div className="category-list">{categories?.map((category) => { const count = category.event_notes?.[0]?.count ?? 0; return <div key={category.name}><div><strong>{category.name}</strong><span>{count} {count === 1 ? "note" : "notes"}</span></div><form action={deleteEventNoteCategory}><input type="hidden" name="name" value={category.name} /><button className="text-button danger-text" disabled={count > 0} title={count > 0 ? "Assigned categories cannot be deleted" : `Delete ${category.name}`}>Delete</button></form></div>; })}</div>
        <form className="category-add" action={addEventNoteCategory}><label>New category<input name="name" maxLength={60} placeholder="Example: Tire Pressure" required /></label><button className="button dark">Add category</button></form>
      </section>
    </section>
  </main>;
}
