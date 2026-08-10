import { addTrackConfiguration, createTrack, updateTrack } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

export default async function TracksPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: tracks } = await supabase.from("tracks").select("*,track_configurations(id,name,distance_miles,is_active)").order("name");
  return <main className="dashboard-main"><section className="page-title"><p className="eyebrow">VENUE DIRECTORY</p><h1>Tracks</h1><p>Tracks own location and weather coordinates. Configurations belong to a track and are assigned to events.</p></section>
    {query.error && <p className="alert">That track update could not be saved.</p>}
    <div className="track-layout"><section className="track-list">{tracks?.map((track) => <article className="track-card" key={track.id}><form action={updateTrack}><input type="hidden" name="track_id" value={track.id} /><div className="form-grid">
      <label className="span-2">Track name<input name="name" defaultValue={track.name} required /></label><label>Short name<input name="short_name" defaultValue={track.short_name ?? ""} /></label><label>Website<input name="website_url" type="url" defaultValue={track.website_url ?? ""} /></label>
      <label className="span-2">Address<input name="address" defaultValue={track.address ?? ""} /></label><label>City<input name="city" defaultValue={track.city ?? ""} /></label><label>State / region<input name="region" defaultValue={track.region ?? ""} /></label>
      <label>Latitude<input name="latitude" type="number" step="0.000001" defaultValue={track.latitude ?? ""} /></label><label>Longitude<input name="longitude" type="number" step="0.000001" defaultValue={track.longitude ?? ""} /></label><button className="button dark span-2">Save track</button></div></form>
      <div className="configuration-list"><p className="eyebrow">CONFIGURATIONS</p>{track.track_configurations?.map((config: { id: string; name: string; distance_miles: number | null }) => <span key={config.id}>{config.name}{config.distance_miles ? ` · ${config.distance_miles} mi` : ""}</span>)}</div>
      <form className="inline-config" action={addTrackConfiguration}><input type="hidden" name="track_id" value={track.id} /><input name="name" placeholder="Configuration name" required /><input name="distance_miles" type="number" step="0.01" min="0" placeholder="Miles" /><button className="button primary">Add</button></form>
    </article>)}</section>
    <aside className="form-card sticky-card"><p className="eyebrow">ADD VENUE</p><h2>New track</h2><form className="stack-form" action={createTrack}><label>Name<input name="name" required /></label><label>Short name<input name="short_name" /></label><label>First configuration<input name="configuration_name" /></label><label>Address<input name="address" /></label><label>City<input name="city" /></label><label>State / region<input name="region" /></label><label>Latitude<input name="latitude" type="number" step="0.000001" /></label><label>Longitude<input name="longitude" type="number" step="0.000001" /></label><label>Website<input name="website_url" type="url" /></label><button className="button primary">Add track</button></form></aside></div>
  </main>;
}
