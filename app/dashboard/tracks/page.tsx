import Link from "next/link";
import { createTrack } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

type Track = {
  id: string; name: string; short_name: string | null; address: string | null; city: string | null;
  region: string | null; postal_code: string | null; country: string; is_active: boolean;
  track_configurations: { id: string; name: string; is_active: boolean }[];
};

export default async function TracksPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("tracks").select("id,name,short_name,address,city,region,postal_code,country,is_active,track_configurations(id,name,is_active)").order("name");
  const tracks = (data ?? []) as unknown as Track[];
  return <main className="dashboard-main">
    <section className="page-title track-page-title"><div><p className="eyebrow">VENUE DIRECTORY</p><h1>Tracks</h1><p>Tracks own location and weather coordinates. Configurations belong to a track and are assigned to events.</p></div><a className="button primary" href="#add-track">+ Add track</a></section>
    {query.error && <p className="alert">That track update could not be saved.</p>}
    <section className="section-block track-directory"><div className="track-grid-head"><span>Track</span><span>Location</span><span>Configurations</span><span>Status</span><span></span></div>
      {tracks.map(track => <Link className="track-grid-row" href={`/dashboard/tracks/${track.id}`} key={track.id}>
        <div><strong>{track.name}</strong><span>{track.short_name ?? "No short name"}</span></div>
        <div><strong>{[track.city, track.region].filter(Boolean).join(", ") || "Location incomplete"}</strong><span>{[track.address, track.postal_code, track.country].filter(Boolean).join(" · ")}</span></div>
        <div><strong>{track.track_configurations.filter(c => c.is_active).length}</strong><span>{track.track_configurations.filter(c => c.is_active).map(c => c.name).join(" · ") || "None"}</span></div>
        <span className={`status-pill ${track.is_active ? "complete" : "cancelled"}`}>{track.is_active ? "Active" : "Inactive"}</span><b>Edit →</b>
      </Link>)}
    </section>
    <section className="section-block add-track-block" id="add-track"><div className="section-heading"><div><p className="eyebrow">NEW VENUE</p><h2>Add a track</h2></div></div>
      <form className="form-grid three" action={createTrack}>
        <label className="span-2">Track name<input name="name" required /></label><label>Short name<input name="short_name" /></label>
        <label className="span-2">Street address<input name="address" /></label><label>City<input name="city" /></label><label>State / region<input name="region" /></label><label>Postal code<input name="postal_code" /></label><label>Country<input name="country" defaultValue="USA" /></label>
        <label>Latitude<input name="latitude" type="number" step="0.000001" /></label><label>Longitude<input name="longitude" type="number" step="0.000001" /></label><label>Timezone<input name="timezone" defaultValue="America/Chicago" /></label>
        <label>Website<input name="website_url" type="url" /></label><label>First configuration<input name="configuration_name" /></label><label className="span-3">Notes<textarea name="notes" rows={3} /></label>
        <button className="button primary span-3">Add track</button>
      </form>
    </section>
  </main>;
}
