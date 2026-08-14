import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConsumableForm from "../../../ConsumableForm";
import type { Asset } from "../../../ConsumablesClient";

export default async function EditConsumablePage({ params, searchParams }: { params: Promise<{ kind: string; id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { kind, id } = await params; const query = await searchParams;
  if (kind !== "tires" && kind !== "pads") notFound();
  const supabase = await createClient();
  const table = kind === "tires" ? "tire_sets" : "pad_sets";
  const [{ data: vehicles }, { data: asset }] = await Promise.all([supabase.from("vehicles").select("id,name").order("name"), supabase.from(table).select("*,vehicles(name)").eq("id", id).single()]);
  if (!asset) notFound();
  return <main className="dashboard-main"><Link className="back-link" href={`/dashboard/consumables?tab=${kind}`}>← Tires + pads</Link><section className="page-title compact-title"><p className="eyebrow">EDIT INVENTORY</p><h1>{asset.business_id}</h1><p>Update the set and return to the inventory table.</p></section>{query.error && <p className="alert">That set could not be saved.</p>}<ConsumableForm kind={kind} vehicles={vehicles ?? []} asset={asset as unknown as Asset} /></main>;
}
