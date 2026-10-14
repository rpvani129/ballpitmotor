import Link from 'next/link';
import {maintenanceData} from '@/lib/maintenance-data';
import RuleForm from '../RuleForm';
export default async function NewRule({searchParams}:{searchParams:Promise<Record<string,string>>}){const q=await searchParams;const d=await maintenanceData();return <main className="dashboard-main"><Link className="back-link" href="/dashboard/maintenance">← Maintenance</Link><h1>Add reminder</h1>{q.error&&<p className="alert">Enter a service name, at least one positive interval, and valid dates and whole numbers. If saving failed, reload and try again.</p>}{d.vehicles.length?<RuleForm vehicles={d.vehicles} usage={Object.fromEntries(d.usage)} today={d.today} defaultVehicle={q.vehicle}/>:<p>Add a vehicle before creating a reminder.</p>}</main>;}
