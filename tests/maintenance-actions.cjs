const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(path,imports){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:m.exports,require:name=>imports[name]??require(name),Date,Intl});return m.exports;}
const logic=load('lib/maintenance.ts',{});
async function mileage(values,role='owner'){
 let update=null;const refresh=[];const chain=data=>({select(){return this},eq(){return this},limit(){return this},maybeSingle:async()=>({data,error:null})});
 const client={auth:{getUser:async()=>({data:{user:{id:'user'}}})},from:table=>table==='memberships'?chain({workspace_id:'workspace',role}):{update:input=>{update=input;return chain({vehicle_id:'vehicle'})}}};
 const actions=load('app/dashboard/maintenance/actions.ts',{'@/lib/supabase/server':{createClient:async()=>client},'@/lib/maintenance':logic,'next/navigation':{redirect:url=>{throw new Error(url)}},'next/cache':{revalidatePath:p=>refresh.push(p)}});
 const form=new FormData();form.set('event_id','event');for(const [k,v] of Object.entries(values))form.set(k,v);let url='';try{await actions.saveEventMileage(form)}catch(e){url=e.message}return {update,url,refresh};
}
(async()=>{
 for(const values of [{starting_odometer_miles:'text'},{starting_odometer_miles:'-1'},{starting_odometer_miles:'1.5'},{starting_odometer_miles:'500',ending_odometer_miles:'499'}]){const r=await mileage(values);assert.equal(r.update,null);assert.ok(r.url.includes('error=mileage'));}
 let r=await mileage({starting_odometer_miles:'0',ending_odometer_miles:'50'});assert.equal(r.update.starting_odometer_miles,0);assert.equal(r.update.ending_odometer_miles,50);assert.ok(r.url.includes('saved=mileage'));assert.ok(r.refresh.includes('/dashboard/maintenance'));
 r=await mileage({starting_odometer_miles:'',ending_odometer_miles:''});assert.equal(r.update.starting_odometer_miles,null);assert.equal(r.update.ending_odometer_miles,null);
 r=await mileage({ending_odometer_miles:'500'});assert.equal(r.update.starting_odometer_miles,null);assert.equal(r.update.ending_odometer_miles,500);
 r=await mileage({ending_odometer_miles:'500'},'viewer');assert.equal(r.update,null);assert.ok(r.url.includes('error=access'));
 const eventSource=fs.readFileSync('app/dashboard/events/[id]/page.tsx','utf8');const nav=eventSource.slice(eventSource.indexOf('<nav className="record-tabs"'),eventSource.indexOf('</nav>',eventSource.indexOf('<nav className="record-tabs"')));assert.ok(nav.indexOf('?tab=sessions')<nav.indexOf('?tab=mileage'));assert.ok(nav.indexOf('?tab=mileage')<nav.indexOf('?tab=notes'));assert.ok(nav.indexOf('?tab=notes')<nav.indexOf('?tab=checklist'));assert.ok(nav.indexOf('?tab=checklist')<nav.indexOf('?tab=attachments'));
 const mileageSource=fs.readFileSync('app/dashboard/events/[id]/EventMileage.tsx','utf8');assert.ok(mileageSource.includes('type="number" inputMode="numeric" name="starting_odometer_miles"'));assert.ok(mileageSource.includes('type="number" inputMode="numeric" name="ending_odometer_miles"'));
 console.log('Mileage numeric/blank/ordering/access validation and event tab order checks passed.');
})().catch(e=>{console.error(e);process.exit(1)});
