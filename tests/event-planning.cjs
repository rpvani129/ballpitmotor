const fs = require('fs'), vm = require('vm'), ts = require('typescript'), assert = require('node:assert/strict');
function load(path, imports = {}) {
  const m = {exports:{}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,
    {exports:m.exports,require:n=>imports[n] ?? require(n),Date,Intl,URL,URLSearchParams,AbortSignal,console});
  return m.exports;
}
const logic = load('lib/event-planning.ts');
assert.equal(logic.nextEventDate('2027-12-31'),'2028-01-01');
assert.equal(logic.nextEventDate('2028-02-28'),'2028-02-29');
assert.equal(logic.nextEventDate('2027-03-13'),'2027-03-14');
assert.equal(logic.validEventDate('2027-02-29'),false);
const setup = logic.cloneEventSetup({event_date:'2027-04-09',vehicle_id:'car',team_id:'team',tire_set_id:'tires',notes:'setup',id:'old',status:'complete',temperature_f:90,starting_odometer_miles:1000,sessions:[1],attachments:[1],checklist_runs:[1]});
assert.equal(setup.event_date,'2027-04-10'); assert.equal(setup.vehicle_id,'car'); assert.equal(setup.notes,'setup');
for(const key of ['id','status','temperature_f','starting_odometer_miles','sessions','attachments','checklist_runs']) assert.equal(key in setup,false);
assert.equal(logic.matchingTrack('MSR Cresson',[{name:'Motorsport Ranch'}]).name,'Motorsport Ranch');
assert.equal(logic.matchingConfiguration('2.7 mile',[{name:'2.7 Mile Circuit CW',is_active:true},{name:'2.7 Mile Circuit CCW',is_active:true}]),undefined);
assert.equal(logic.driveSourceId('https://evil.test/calendar?event=id'),null);
assert.equal(logic.driveSourceId(logic.driveSourceUrl('event id')),'event id');
async function create(values={},options={}) {
 const writes=[],weather=[],filters=[];
 const source={id:'source',event_date:'2027-04-09',source_url:logic.driveSourceUrl('public-weekend'),team_name:'Legacy team',team_id:null};
 const tables={memberships:{workspace_id:'ws',role:options.role||'owner'},tracks:{id:'track',name:'ECR',latitude:33,longitude:-97},track_configurations:{id:'config',name:'2.7 CCW',track_id:'track'},vehicles:{id:'car',name:'Golf Ball'},tire_sets:{id:'tires',business_id:'T1',vehicle_id:options.wrongVehicle?'other':'car'},pad_sets:null,event_types:null,teams:null};
 const client={auth:{getUser:async()=>({data:{user:{id:'user'}}})},from(table){
  let inserted=null;const conditions={};
  const query={select(){return this},eq(k,v){conditions[k]=v;filters.push([table,k,v]);return this},limit(){return this},like(){return this},insert(p){inserted=p;writes.push([table,p]);return this},
   async maybeSingle(){if(table==='events') return {data: conditions.id==='source'?(options.foreign?null:source):options.existing?{id:'existing'}:null};return {data:tables[table]};},
   async single(){return {data:inserted?{id:inserted.id || 'new'}:tables[table]};},then(resolve,reject){return Promise.resolve({count:0,data:[]}).then(resolve,reject)}};return query;
 }};
 const actions=load('app/actions.ts',{'@/lib/supabase/server':{createClient:async()=>client},'@/lib/grid':{eventBusinessId:()=> 'EVT-GB-20270410-01'},'@/lib/weather':{getEventWeather:async date=>{weather.push(date);return {temperature_f:60};}},'@/lib/provision-workspace':{},'@/lib/event-planning':logic,'@/lib/drive-ntx':{getDriveEvents:async()=>({events:[{id:'public-weekend',start_at:'2027-04-09T12:00:00Z'}]})},'next/cache':{revalidatePath(){}},'next/navigation':{redirect:url=>{throw new Error(url)}}});
 const form=new FormData();for(const[k,v]of Object.entries({clone_from_event_id:'source',vehicle_id:'car',track_id:'track',configuration_id:'config',event_name:'Weekend',event_date:'2027-04-10',tire_set_id:'tires',driver_name:'Driver',notes:'setup',...values}))form.set(k,v);
 let redirect='';try{await actions.createEvent(form)}catch(e){redirect=e.message}return {writes,weather,filters,redirect};
}
(async()=>{
 const first=await create();assert.equal(first.writes.length,1);const [table,row]=first.writes[0];assert.equal(table,'events');assert.equal(row.status,'planned');assert.equal(row.team_name,'Legacy team');assert.equal(row.event_date,'2027-04-10');assert.equal(row.tire_set_id,'tires');assert.equal(row.source_url,logic.driveSourceUrl('public-weekend'));assert.equal(first.weather[0],'2027-04-10');assert.match(first.redirect,/cloned=1/);
 for(const k of ['starting_odometer_miles','ending_odometer_miles','sessions','attachments'])assert.equal(k in row,false);
 const repeat=await create();assert.equal(repeat.writes[0][1].id,row.id);
 const third=await create({event_date:'2027-04-11'});assert.notEqual(third.writes[0][1].id,row.id);
 for(const [values,options,error]of [[{event_date:'2027-04-09'}, {},'same_date'],[{}, {foreign:true},'source'],[{}, {role:'viewer'},'access'],[{}, {wrongVehicle:true},'selection']]){const result=await create(values,options);assert.equal(result.writes.length,0);assert.ok(result.redirect.includes(error),result.redirect);}
 const already=await create({}, {existing:true});assert.equal(already.writes.length,0);assert.equal(already.redirect,'/dashboard/events/existing');
 const planned=await create({clone_from_event_id:'',drive_ntx_event_id:'public-weekend',event_date:'2027-04-09'});assert.equal(planned.writes.length,1);assert.equal(planned.writes[0][1].event_date,'2027-04-09');
 const wrongDay=await create({clone_from_event_id:'',drive_ntx_event_id:'public-weekend',event_date:'2027-04-10'});assert.equal(wrongDay.writes.length,0);assert.match(wrongDay.redirect,/error=source/);
 assert.ok(first.filters.some(([t,k,v])=>t==='events'&&k==='workspace_id'&&v==='ws'));
 console.log('Event planning and cloning: dates, setup-only copy, fresh activity, source links, idempotency, first-day planning, workspace and role checks passed.');
})().catch(e=>{console.error(e);process.exit(1)});
