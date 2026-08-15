import Link from "next/link";
import { deleteTrack } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import DeleteRecordButton from "../DeleteRecordButton";

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
    <section className="page-title track-page-title"><div><p className="eyebrow">VENUE DIRECTORY</p><h1>Tracks</h1><p>Tracks own location and weather coordinates. Configurations belong to a track and are assigned to events.</p></div><Link className="button primary" href="/dashboard/tracks/new">+ Add track</Link></section>
    {query.error && <p className="alert">{query.error === "track_in_use" ? "That track is assigned to an event and cannot be deleted." : "That track could not be saved or deleted."}</p>}{query.deleted && <p className="success-message">Track deleted.</p>}
    <section className="section-block track-directory"><div className="track-grid-head"><span>Track</span><span>Location</span><span>Configurations</span><span>Status</span><span></span></div>
      {tracks.map(track => <div className="track-grid-row" key={track.id}>
        <div><strong>{track.name}</strong><span>{track.short_name ?? "No short name"}</span></div>
        <div><strong>{[track.city, track.region].filter(Boolean).join(", ") || "Location incomplete"}</strong><span>{[track.address, track.postal_code, track.country].filter(Boolean).join(" · ")}</span></div>
        <div><strong>{track.track_configurations.filter(c => c.is_active).length}</strong><span>{track.track_configurations.filter(c => c.is_active).map(c => c.name).join(" · ") || "None"}</span></div>
        <span className={`status-pill ${track.is_active ? "complete" : "cancelled"}`}>{track.is_active ? "Active" : "Inactive"}</span><div className="track-row-actions"><Link href={`/dashboard/tracks/${track.id}`}>Layouts</Link><Link href={`/dashboard/tracks/${track.id}/edit`}>Edit</Link><DeleteRecordButton action={deleteTrack} fields={{ track_id: track.id }} label="Delete" className="text-button danger-text" confirmMessage={`Delete ${track.name} and all of its configurations? Tracks assigned to events cannot be deleted.`} /></div>
      </div>)}
    </section>
  </main>;
}
