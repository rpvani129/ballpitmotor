export type MaintenanceRule = { id:string; workspace_id:string; vehicle_id:string; name:string; notes:string|null; interval_months:number|null; interval_miles:number|null; interval_sessions:number|null; warning_days:number; warning_miles:number; warning_sessions:number; baseline_date:string|null; baseline_miles:number|null; baseline_sessions:number|null; state:string; version:number };
export type MileageReading = { date:string; miles:number; source:string; href?:string; priority:number };
export type Usage = { mileage:number|null; mileageDate:string|null; sessions:number; readings:MileageReading[] };
export type ReminderStatus = 'Current'|'Due Soon'|'Overdue'|'Needs Baseline'|'Paused'|'Archived';
export function todayChicago(now=new Date()) { const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);const value=(type:string)=>parts.find(p=>p.type===type)?.value;return `${value('year')}-${value('month')}-${value('day')}`; }
export function addMonths(date:string,months:number) {
 const [y,m,d]=date.split('-').map(Number);const target=new Date(Date.UTC(y,m-1+months,1));const last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();target.setUTCDate(Math.min(d,last));return target.toISOString().slice(0,10);
}
export function reminderStatus(rule:MaintenanceRule,usage:Usage,today=todayChicago()) {
 const due: {label:string; remaining:number|null; warning:number}[]=[];
 if(rule.interval_months!=null) {const date=rule.baseline_date?addMonths(rule.baseline_date,rule.interval_months):null;due.push({label:date?`Due ${date}`:'Date baseline needed',remaining:date?Math.round((Date.parse(date)-Date.parse(today))/86400000):null,warning:rule.warning_days});}
 if(rule.interval_miles!=null) {const target=rule.baseline_miles!=null?rule.baseline_miles+rule.interval_miles:null;due.push({label:target!=null?`Due at ${target.toLocaleString()} miles`:'Mileage baseline needed',remaining:target!=null&&usage.mileage!=null?target-usage.mileage:null,warning:rule.warning_miles});}
 if(rule.interval_sessions!=null) {const target=rule.baseline_sessions!=null?rule.baseline_sessions+rule.interval_sessions:null;due.push({label:target!=null?`Due at ${target} total sessions`:'Session baseline needed',remaining:target!=null?target-usage.sessions:null,warning:rule.warning_sessions});}
 let status:ReminderStatus='Current';
 if(rule.state==='archived')status='Archived';else if(rule.state==='paused')status='Paused';else if(due.some(x=>x.remaining!=null&&x.remaining<=0))status='Overdue';else if(due.some(x=>x.remaining!=null&&x.remaining<=x.warning))status='Due Soon';else if(due.some(x=>x.remaining==null))status='Needs Baseline';
 return {status,due,missing:due.some(x=>x.remaining==null)};
}
export function latestMileage(readings:MileageReading[], fallback:number|null=null,today=todayChicago()) { const sorted=readings.filter(r=>r.date<=today).sort((a,b)=>b.date.localeCompare(a.date)||b.miles-a.miles||b.priority-a.priority);return {mileage:sorted[0]?.miles??fallback,mileageDate:sorted[0]?.date??null,readings:sorted}; }
