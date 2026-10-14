import { createClient } from '@/lib/supabase/server';
import { latestMileage,todayChicago,type MaintenanceRule,type MileageReading,type Usage } from './maintenance';
export async function maintenanceData(workspaceId?:string) {
 const supabase=await createClient();
 const scope=(table:string,columns:string)=>{const q=supabase.from(table).select(columns);return workspaceId?q.eq('workspace_id',workspaceId):q;};
 const results=await Promise.all([
 scope('maintenance_rules','*'),scope('vehicles','id,name,workspace_id,current_odometer_miles,odometer_recorded_on'),
 scope('events','id,vehicle_id,event_date,status,starting_odometer_miles,ending_odometer_miles,sessions(id)'),
 scope('maintenance_records','id,vehicle_id,service_date,title,odometer_miles'),scope('maintenance_completions','*'),
 ]);
 if(results.some(r=>r.error))throw new Error('Maintenance data could not be loaded.');
 const [rules,vehicles,events,records,history]=results.map(r=>r.data??[]) as unknown as [MaintenanceRule[],{id:string;name:string;workspace_id:string;current_odometer_miles:number|null;odometer_recorded_on:string|null}[],{id:string;vehicle_id:string|null;event_date:string;status:string;starting_odometer_miles:number|null;ending_odometer_miles:number|null;sessions:{id:string}[]}[],{id:string;vehicle_id:string;service_date:string;title:string;odometer_miles:number|null}[],{id:string;rule_id:string;vehicle_id:string;completed_on:string;odometer_miles:number|null;session_count:number;notes:string|null;service_record_id:string|null;rule_name:string}[]];
 const today=todayChicago();const usage=new Map<string,Usage>();
 for(const v of vehicles){const readings:MileageReading[]=[];let sessions=0;
  if(v.odometer_recorded_on&&v.current_odometer_miles!=null)readings.push({date:v.odometer_recorded_on,miles:v.current_odometer_miles,source:'Vehicle mileage',priority:0});
  for(const e of events.filter(e=>e.vehicle_id===v.id&&['active','complete','needs_review'].includes(e.status)&&e.event_date<=today)){sessions+=e.sessions?.length??0;for(const [field,label,priority] of [['starting_odometer_miles','Event start',1],['ending_odometer_miles','Event end',4]] as const){if(e[field]!=null)readings.push({date:e.event_date,miles:e[field]!,source:label,href:`/dashboard/events/${e.id}?tab=mileage`,priority});}}
  for(const r of records.filter(r=>r.vehicle_id===v.id&&r.odometer_miles!=null))readings.push({date:r.service_date,miles:r.odometer_miles!,source:r.title,href:`/dashboard/vehicles/${v.id}`,priority:2});
  for(const c of history.filter(c=>c.vehicle_id===v.id&&c.odometer_miles!=null))readings.push({date:c.completed_on,miles:c.odometer_miles!,source:c.rule_name,href:`/dashboard/maintenance/${c.rule_id}`,priority:3});
  usage.set(v.id,{...latestMileage(readings,v.odometer_recorded_on && v.odometer_recorded_on > today ? null : v.current_odometer_miles,today),sessions});
 }
 return {supabase,rules,vehicles,events,records,history,usage,today};
}
