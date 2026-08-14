import Link from "next/link";
import { redirect } from "next/navigation";
import { addEventNoteCategory, addEventType, addTeam, deleteEventNoteCategory, deleteEventType, deleteTeam, updateEventSettings, updateFirstTimeSettings } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

export default async function EventSettingsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: membership } = await supabase.from("memberships").select("workspace_id,workspaces(name,slug)").eq("user_id", user!.id).eq("status", "active").limit(1).single();
  if (!membership) redirect("/dashboard");
  const [{ data: settings }, { data: categories }, { data: profile }, { data: eventTypes }, { data: teams }, { data: events }] = await Promise.all([
    supabase.from("event_settings").select("show_public_events,show_first_time_popup").eq("workspace_id", membership.workspace_id).maybeSingle(),
    supabase.from("event_note_categories").select("name,event_notes(count)").eq("workspace_id", membership.workspace_id).order("name"),
    supabase.from("user_profiles").select("public_slug").eq("user_id", user!.id).single(),
    supabase.from("event_types").select("id,name").eq("workspace_id", membership.workspace_id).order("name"),
    supabase.from("teams").select("id,name").eq("workspace_id", membership.workspace_id).order("name"),
    supabase.from("events").select("event_type_id,team_id").eq("workspace_id", membership.workspace_id),
  ]);
  const eventTypeCounts = new Map<string, number>();
  const teamCounts = new Map<string, number>();
  events?.forEach((event) => {
    if (event.event_type_id) eventTypeCounts.set(event.event_type_id, (eventTypeCounts.get(event.event_type_id) ?? 0) + 1);
    if (event.team_id) teamCounts.set(event.team_id, (teamCounts.get(event.team_id) ?? 0) + 1);
  });
  const errorMessage = query.error === "category_in_use"
    ? "That category is assigned to an existing note and cannot be deleted."
    : query.error === "event_type_in_use"
      ? "That event type is assigned to an existing event and cannot be deleted."
      : query.error === "team_in_use"
        ? "That team is assigned to an existing event and cannot be deleted."
        : "That change could not be saved.";
  const publicUrl = `/events/${profile!.public_slug}`;
  return <main className="dashboard-main">
    <Link className="back-link" href="/dashboard">← Events</Link>
    <section className="page-title"><p className="eyebrow">EVENT SETTINGS</p><h1>Control the public grid.</h1><p>Choose what visitors can see and manage the categories used by your event journal.</p></section>
    {query.saved && <p className="success-message">Event settings saved.</p>}
    {query.error && <p className="alert">{errorMessage}</p>}
    <section className="settings-stack">
      <form className="settings-card" action={updateFirstTimeSettings}>
        <div><p className="eyebrow">GETTING STARTED</p><h2>First-time guide</h2><p>Show the setup guide when you open The Grid. It links to vehicles, tires and pads, tracks, and your first event.</p></div>
        <label className="setting-toggle"><input type="checkbox" name="show_first_time_popup" value="true" defaultChecked={settings?.show_first_time_popup ?? true} /><span>Show the getting-started popup on login</span></label>
        <div className="settings-actions"><button className="button primary">Save preference</button></div>
      </form>
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
      <section className="settings-card">
        <div><p className="eyebrow">EVENT SETUP</p><h2>Event types</h2><p>Control the event types available in event forms. An event type cannot be deleted while an event uses it.</p></div>
        <div className="category-list">{eventTypes?.map((eventType) => { const count = eventTypeCounts.get(eventType.id) ?? 0; return <div key={eventType.id}><div><strong>{eventType.name}</strong><span>{count} {count === 1 ? "event" : "events"}</span></div><form action={deleteEventType}><input type="hidden" name="id" value={eventType.id} /><button className="text-button danger-text" disabled={count > 0} title={count > 0 ? "Assigned event types cannot be deleted" : `Delete ${eventType.name}`}>Delete</button></form></div>; })}</div>
        <form className="category-add" action={addEventType}><label>New event type<input name="name" maxLength={80} placeholder="Example: Test Day" required /></label><button className="button dark">Add event type</button></form>
      </section>
      <section className="settings-card">
        <div><p className="eyebrow">EVENT SETUP</p><h2>Teams</h2><p>Control the optional teams available in event forms. A team cannot be deleted while an event uses it.</p></div>
        <div className="category-list">{teams?.map((team) => { const count = teamCounts.get(team.id) ?? 0; return <div key={team.id}><div><strong>{team.name}</strong><span>{count} {count === 1 ? "event" : "events"}</span></div><form action={deleteTeam}><input type="hidden" name="id" value={team.id} /><button className="text-button danger-text" disabled={count > 0} title={count > 0 ? "Assigned teams cannot be deleted" : `Delete ${team.name}`}>Delete</button></form></div>; })}</div>
        <form className="category-add" action={addTeam}><label>New team<input name="name" maxLength={120} placeholder="Example: Ball Pit Motor" required /></label><button className="button dark">Add team</button></form>
      </section>
    </section>
  </main>;
}
