const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(path,imports={}){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:m.exports,require:n=>imports[n]??require(n),Date,Intl});return m.exports;}
const logic=load('lib/maintenance.ts');
const tables={vehicles:[{id:'golf',current_odometer_miles:null,odometer_recorded_on:null}],events:[{id:'event',vehicle_id:'golf',event_date:'2026-10-18',status:'planned',starting_odometer_miles:89386,ending_odometer_miles:null,sessions:[{id:'session'}]}],maintenance_records:[{vehicle_id:'golf',service_date:'2026-07-13',odometer_miles:88802,title:'Oil change'}],maintenance_rules:[],maintenance_completions:[]};
const client={from:t=>({select(){return this},eq(){return this},then(resolve){return Promise.resolve({data:tables[t],error:null}).then(resolve)}})};
const {maintenanceData}=load('lib/maintenance-data.ts',{'./maintenance':{...logic,todayChicago:()=> '2026-10-22'},'@/lib/supabase/server':{createClient:async()=>client}});
(async()=>{
 let d=await maintenanceData('workspace');assert.equal(d.usage.get('golf').mileage,89386);assert.equal(d.usage.get('golf').sessions,0);assert.equal(d.usage.get('golf').readings[0].source,'Event start');
 tables.events[0].ending_odometer_miles=89500;d=await maintenanceData();assert.equal(d.usage.get('golf').mileage,89500);
 tables.events[0].starting_odometer_miles=88000;tables.events[0].ending_odometer_miles=null;d=await maintenanceData();assert.equal(d.usage.get('golf').mileage,88802);
 tables.events=[];d=await maintenanceData();assert.equal(d.usage.get('golf').mileage,88802);
 tables.events=[{id:'future',vehicle_id:'golf',event_date:'2027-01-01',status:'planned',starting_odometer_miles:99999,sessions:[]}];d=await maintenanceData();assert.equal(d.usage.get('golf').mileage,88802);
 tables.vehicles[0].current_odometer_miles=90000;d=await maintenanceData();assert.equal(d.usage.get('golf').mileage,90000);
 console.log('Event mileage aggregation, edits/deletion, future exclusion, manual reading and source checks passed.');
})().catch(e=>{console.error(e);process.exit(1)});
