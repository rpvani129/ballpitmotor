import Link from "next/link";
import { notFound } from "next/navigation";
import { addTrackConfiguration, updateTrack, updateTrackConfiguration } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

type Configuration = { id: string; name: string; direction: string | null; distance_miles: number | null; is_active: boolean };

export default async function TrackEditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("tracks").select("*,track_configurations(id,name,direction,distance_miles,is_active)").eq("id", id).single();
  if (!data) notFound();
  const configurations = (data.track_configurations ?? []) as Configuration[];
  return <main className="dashboard-main">
    <Link className="back-link" href="/dashboard/tracks">← Track directory</Link>
    <section className="vehicle-detail-hero"><div><p className="eyebrow">EDIT VENUE</p><h1>{data.short_name ?? data.name}</h1><p>{data.name}</p></div><div className="vehicle-count"><strong>{configurations.length}</strong><span>Configurations</span></div></section>
    {query.error && <p className="alert">That track update could not be saved.</p>}
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">TRACK INFORMATION</p><h2>Venue details</h2></div></div>
      <form className="form-grid three" action={updateTrack}><input type="hidden" name="track_id" value={data.id} />
        <label className="span-2">Track name<input name="name" defaultValue={data.name} required /></label><label>Short name<input name="short_name" defaultValue={data.short_name ?? ""} /></label>
        <label className="span-2">Street address<input name="address" defaultValue={data.address ?? ""} /></label><label>City<input name="city" defaultValue={data.city ?? ""} /></label><label>State / region<input name="region" defaultValue={data.region ?? ""} /></label><label>Postal code<input name="postal_code" defaultValue={data.postal_code ?? ""} /></label><label>Country<input name="country" defaultValue={data.country ?? "USA"} /></label>
        <label>Latitude<input name="latitude" type="number" step="0.000001" defaultValue={data.latitude ?? ""} /></label><label>Longitude<input name="longitude" type="number" step="0.000001" defaultValue={data.longitude ?? ""} /></label><label>Timezone<input name="timezone" defaultValue={data.timezone ?? "America/Chicago"} /></label>
        <label>Website<input name="website_url" type="url" defaultValue={data.website_url ?? ""} /></label><label>Status<select name="is_active" defaultValue={data.is_active ? "true" : "false"}><option value="true">Active</option><option value="false">Inactive</option></select></label>
        <label className="span-3">Notes<textarea name="notes" rows={3} defaultValue={data.notes ?? ""} /></label><button className="button primary span-3">Save track</button>
      </form>
    </section>
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">LAYOUTS</p><h2>Configurations</h2></div></div>
      <div className="configuration-editor-list">{configurations.sort((a,b) => a.name.localeCompare(b.name)).map(config => <form className={config.is_active ? "configuration-editor-row" : "configuration-editor-row inactive"} action={updateTrackConfiguration} key={config.id}>
        <input type="hidden" name="track_id" value={data.id} /><input type="hidden" name="configuration_id" value={config.id} />
        <label>Name<input name="name" defaultValue={config.name} required /></label><label>Direction<select name="direction" defaultValue={config.direction ?? ""}><option value="">Not specified</option><option value="CCW">CCW</option><option value="CW">CW</option><option value="Mixed">Mixed</option></select></label>
        <label>Distance (mi)<input name="distance_miles" type="number" step="0.01" min="0" defaultValue={config.distance_miles ?? ""} /></label><label>Status<select name="is_active" defaultValue={config.is_active ? "true" : "false"}><option value="true">Active</option><option value="false">Inactive</option></select></label><button className="button dark">Save</button>
      </form>)}</div>
      <form className="configuration-editor-row add" action={addTrackConfiguration}><input type="hidden" name="track_id" value={data.id} /><label>Name<input name="name" placeholder="New configuration" required /></label><label>Direction<select name="direction"><option value="">Not specified</option><option value="CCW">CCW</option><option value="CW">CW</option><option value="Mixed">Mixed</option></select></label><label>Distance (mi)<input name="distance_miles" type="number" step="0.01" min="0" /></label><span></span><button className="button primary">+ Add</button></form>
    </section>
  </main>;
}
