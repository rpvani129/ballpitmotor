import Link from "next/link";
import TrackForm from "../TrackForm";
export default async function NewTrackPage({ searchParams }: { searchParams: Promise<Record<string,string>> }) { const query = await searchParams; return <main className="dashboard-main"><Link className="back-link" href="/dashboard/tracks">← Tracks</Link><section className="page-title compact-title"><p className="eyebrow">NEW VENUE</p><h1>Add track</h1><p>Create the venue and return to the track directory.</p></section>{query.error && <p className="alert">That track could not be saved.</p>}<TrackForm /></main>; }
