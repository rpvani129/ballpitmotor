import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TrackForm from "../../TrackForm";
export default async function EditTrackPage({ params, searchParams }: { params: Promise<{id:string}>; searchParams: Promise<Record<string,string>> }) { const { id } = await params; const query = await searchParams; const supabase = await createClient(); const { data } = await supabase.from("tracks").select("*").eq("id",id).single(); if(!data) notFound(); return <main className="dashboard-main"><Link className="back-link" href="/dashboard/tracks">← Tracks</Link><section className="page-title compact-title"><p className="eyebrow">EDIT VENUE</p><h1>{data.short_name ?? data.name}</h1><p>Update the venue and return to the track directory.</p></section>{query.error && <p className="alert">That track could not be saved.</p>}<TrackForm track={data} /></main>; }
