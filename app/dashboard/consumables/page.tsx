import ConsumablesClient, { type Asset } from "./ConsumablesClient";
import { createClient } from "@/lib/supabase/server";

type CountedEvent = { tire_set_id: string | null; front_pad_set_id: string | null; rear_pad_set_id: string | null; sessions: { count: number }[] };

export default async function ConsumablesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const query = await searchParams;
  const tab = query.tab === "pads" ? "pads" : "tires";
  const supabase = await createClient();
  const [{ data: vehicles }, { data: tires }, { data: pads }, { data: rawEvents }] = await Promise.all([
    supabase.from("vehicles").select("id,name").eq("status", "active").order("name"),
    supabase.from("tire_sets").select("*,vehicles(name)").order("business_id"),
    supabase.from("pad_sets").select("*,vehicles(name)").order("business_id"),
    supabase.from("events").select("tire_set_id,front_pad_set_id,rear_pad_set_id,sessions(count)"),
  ]);
  const events = (rawEvents ?? []) as unknown as CountedEvent[];
  const countFor = (id: string, kind: "tire" | "pad") => events.reduce((sum, event) => {
    const assigned = kind === "tire" ? event.tire_set_id === id : event.front_pad_set_id === id || event.rear_pad_set_id === id;
    return sum + (assigned ? (event.sessions?.[0]?.count ?? 0) : 0);
  }, 0);
  const withCounts = (assets: Asset[], kind: "tire" | "pad") => assets.map(asset => {
    const loggedSessions = countFor(asset.id, kind);
    return { ...asset, loggedSessions, totalSessions: loggedSessions + (asset.starting_sessions ?? 0) };
  });
  return <main className="dashboard-main"><section className="page-title"><p className="eyebrow">WHAT&apos;S ON THE CAR</p><h1>Tires + Pads</h1><p>Review current sets and session life. Retired equipment stays available as history.</p></section>
    {query.error && <p className="alert">That set could not be saved. Check the ID and required fields.</p>}
    <ConsumablesClient tab={tab} vehicles={vehicles ?? []} tires={withCounts((tires ?? []) as unknown as Asset[], "tire")} pads={withCounts((pads ?? []) as unknown as Asset[], "pad")} />
  </main>;
}
