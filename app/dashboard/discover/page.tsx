import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getDriveEvents } from '@/lib/drive-ntx';
import { driveSourceId } from '@/lib/event-planning';
import DiscoverEvents from './DiscoverEvents';

export default async function DiscoverPage() {
  const supabase = await createClient();
  const {data:{user}} = await supabase.auth.getUser();
  const {data:member} = await supabase.from('memberships').select('workspace_id,role').eq('user_id',user!.id).eq('status','active').limit(1).maybeSingle();
  if (!member) return <main className="dashboard-main"><h1>Create your workspace first</h1><Link href="/dashboard">Back to Events</Link></main>;
  const [feed, {data:planned}] = await Promise.all([
    getDriveEvents(),
    supabase.from('events').select('id,event_date,source_url').eq('workspace_id',member.workspace_id).like('source_url','https://drive.ballpitmotor.com/calendar?event=%').order('event_date'),
  ]);
  const selected = (planned || []).flatMap(event => { const sourceId = driveSourceId(event.source_url); return sourceId ? [{sourceId,id:event.id,date:event.event_date}] : []; });
  return <main className="dashboard-main">
    <Link className="back-link" href="/dashboard">← My events</Link>
    <section className="page-title"><p className="eyebrow">DRIVE NORTH TEXAS</p><h1>Discover events</h1><p>Find your next track day. Plan the first day, then clone its setup for Saturday or Sunday. Your plans stay in your workspace.</p></section>
    {feed.cached && <p className="alert">{feed.unavailable ? 'Drive NTX is unavailable. Please try again later.' : 'Live refresh is temporarily unavailable. Showing saved schedules.'}</p>}
    <DiscoverEvents events={feed.events} selected={selected} canPlan={['owner','admin','editor'].includes(member.role)} />
  </main>;
}
