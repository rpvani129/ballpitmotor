import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteTrack, deleteTrackConfiguration } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import DeleteRecordButton from "../../DeleteRecordButton";

type Configuration = { id:string; name:string; direction:string|null; distance_miles:number|null; is_active:boolean };

export default async function TrackPage({ params, searchParams }: { params: Promise<{id:string}>; searchParams: Promise<Record<string,string>> }) {
  const { id } = await params; const query = await searchParams; const supabase = await createClient();
  const { data } = await supabase.from("tracks").select("*,track_configurations(id,name,direction,distance_miles,is_active)").eq("id",id).single();
  if (!data) notFound();
  const configurations = (data.track_configurations ?? []) as Configuration[];
  return <main className="dashboard-main">
    <Link className="back-link" href="/dashboard/tracks">← Track directory</Link>
    <section className="vehicle-detail-hero"><div><p className="eyebrow">VENUE FILE</p><h1>{data.short_name ?? data.name}</h1><p>{data.name} · {[data.city,data.region].filter(Boolean).join(", ") || "Location incomplete"}</p></div><div className="vehicle-hero-actions"><div className="record-actions"><Link className="button dark" href={`/dashboard/tracks/${id}/edit`}>Edit track</Link><DeleteRecordButton action={deleteTrack} fields={{ track_id: id }} confirmMessage={`Delete ${data.name} and all of its configurations? Tracks assigned to events cannot be deleted.`} /></div><div className="vehicle-count"><strong>{configurations.length}</strong><span>Configurations</span></div></div></section>
    {query.error && <p className="alert">{query.error === "configuration_in_use" ? "That configuration is assigned to an event and cannot be deleted." : "That record could not be deleted."}</p>}{query.deleted && <p className="success-message">Configuration deleted.</p>}
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">LAYOUTS</p><h2>Configurations</h2></div><Link className="button primary" href={`/dashboard/tracks/${id}/configurations/new`}>+ Add configuration</Link></div>
      <div className="configuration-table"><div className="configuration-table-head"><span>Name</span><span>Direction</span><span>Distance</span><span>Status</span><span></span></div>{configurations.sort((a,b)=>a.name.localeCompare(b.name)).map(configuration => <div className={`configuration-table-row ${configuration.is_active ? "" : "inactive"}`} key={configuration.id}><strong>{configuration.name}</strong><span>{configuration.direction ?? "—"}</span><span>{configuration.distance_miles != null ? `${configuration.distance_miles} mi` : "—"}</span><span>{configuration.is_active ? "Active" : "Inactive"}</span><div className="record-actions"><Link className="button ghost compact-button" href={`/dashboard/tracks/${id}/configurations/${configuration.id}/edit`}>Edit</Link><DeleteRecordButton action={deleteTrackConfiguration} fields={{ track_id: id, configuration_id: configuration.id }} confirmMessage={`Delete ${configuration.name}? Configurations assigned to events cannot be deleted.`} /></div></div>)}</div>
      {!configurations.length && <div className="empty-state"><strong>No configurations yet.</strong><p>Add the first layout for this track.</p></div>}
    </section>
  </main>;
}
