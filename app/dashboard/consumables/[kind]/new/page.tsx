import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConsumableForm from "../../ConsumableForm";

export default async function NewConsumablePage({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<Record<string, string>> }) {
  const { kind } = await params; const query = await searchParams;
  if (kind !== "tires" && kind !== "pads") notFound();
  const supabase = await createClient();
  const { data: vehicles } = await supabase.from("vehicles").select("id,name").eq("status", "active").order("name");
  return <main className="dashboard-main"><Link className="back-link" href={`/dashboard/consumables?tab=${kind}`}>← Tires + pads</Link><section className="page-title compact-title"><p className="eyebrow">NEW INVENTORY</p><h1>Add {kind === "tires" ? "tire" : "pad"} set</h1><p>Create the set and return to the inventory table.</p></section>{query.error && <p className="alert">That set could not be saved. Check the required fields.</p>}<ConsumableForm kind={kind} vehicles={vehicles ?? []} /></main>;
}
