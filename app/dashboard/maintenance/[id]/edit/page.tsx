import Link from 'next/link';
import {notFound} from 'next/navigation';
import {maintenanceData} from '@/lib/maintenance-data';
import RuleForm from '../../RuleForm';
export default async function EditRule({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string>>}){const {id}=await params;const q=await searchParams;const d=await maintenanceData();const rule=d.rules.find(r=>r.id===id);if(!rule)notFound();return <main className="dashboard-main"><Link className="back-link" href={`/dashboard/maintenance/${id}`}>← Reminder</Link><h1>Edit reminder</h1>{q.error&&<p className="alert">Enter at least one positive interval and valid baselines. If another update occurred, reload before saving.</p>}<RuleForm rule={rule} vehicles={d.vehicles} usage={Object.fromEntries(d.usage)} today={d.today}/></main>;}
