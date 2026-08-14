import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Configuration = { id:string; name:string; direction:string|null; distance_miles:number|null; is_active:boolean };

export default async function TrackPage({ params }: { params: Promise<{id:string}> }) {
  const { id } = await params; const supabase = await createClient();
  const { data } = await supabase.from("tracks").select("*,track_configurations(id,name,direction,distance_miles,is_active)").eq("id",id).single();
  if (!data) notFound();
  const configurations = (data.track_configurations ?? []) as Configuration[];
  return <main className="dashboard-main">
    <Link className="back-link" href="/dashboard/tracks">← Track directory</Link>
    <section className="vehicle-detail-hero"><div><p className="eyebrow">VENUE FILE</p><h1>{data.short_name ?? data.name}</h1><p>{data.name} · {[data.city,data.region].filter(Boolean).join(", ") || "Location incomplete"}</p></div><div className="vehicle-hero-actions"><Link className="button dark" href={`/dashboard/tracks/${id}/edit`}>Edit track</Link><div className="vehicle-count"><strong>{configurations.length}</strong><span>Configurations</span></div></div></section>
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">LAYOUTS</p><h2>Configurations</h2></div><Link className="button primary" href={`/dashboard/tracks/${id}/configurations/new`}>+ Add configuration</Link></div>
      <div className="configuration-table"><div className="configuration-table-head"><span>Name</span><span>Direction</span><span>Distance</span><span>Status</span><span></span></div>{configurations.sort((a,b)=>a.name.localeCompare(b.name)).map(configuration => <div className={`configuration-table-row ${configuration.is_active ? "" : "inactive"}`} key={configuration.id}><strong>{configuration.name}</strong><span>{configuration.direction ?? "—"}</span><span>{configuration.distance_miles != null ? `${configuration.distance_miles} mi` : "—"}</span><span>{configuration.is_active ? "Active" : "Inactive"}</span><Link className="button ghost compact-button" href={`/dashboard/tracks/${id}/configurations/${configuration.id}/edit`}>Edit</Link></div>)}</div>
      {!configurations.length && <div className="empty-state"><strong>No configurations yet.</strong><p>Add the first layout for this track.</p></div>}
    </section>
  </main>;
}
