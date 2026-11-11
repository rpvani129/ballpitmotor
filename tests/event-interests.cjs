const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict');
async function run({save=true,event='announced-apex-2027-01-16',user=true,member=true,available=true,dbError=false}={}){
 const touched=[],filters=[],refresh=[];let upsert=null;
 const query={select(){return this},eq(k,v){filters.push([k,v]);return this},limit(){return this},maybeSingle:async()=>({data:member?{workspace_id:'workspace'}:null})};
 const client={
  auth:{getUser:async()=>({data:{user:user?{id:'self'}:null}})},
  from(table){
   touched.push(table);
   if(table==='memberships')return query;
   assert.equal(table,'event_interests');
   return {
    upsert(row,opts){upsert={row,opts};return Promise.resolve({error:dbError?{message:'failed'}:null});},
    delete(){return {
     eq(k,v){filters.push([k,v]);return this;},
     then(resolve){return Promise.resolve({error:dbError?{}:null}).then(resolve);}
    };}
   };
  }
 };
 const m={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/dashboard/discover/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:m.exports,require:n=>({'@/lib/supabase/server':{createClient:async()=>client},'@/lib/drive-ntx':{getDriveEvents:async()=>({events:available?[{id:event}]:[]})},'next/cache':{revalidatePath:path=>refresh.push(path)}}[n]||require(n))});
 const result=await m.exports.setEventInterest(event,save);return {result,touched,filters,refresh,upsert};
}
(async()=>{
 const added=await run();assert.equal(added.result.error,undefined);assert.equal(added.upsert.row.user_id,'self');assert.equal(added.upsert.row.workspace_id,'workspace');assert.equal(added.upsert.opts.ignoreDuplicates,true);assert.ok(added.refresh.includes('/dashboard/discover'));
 const removed=await run({save:false,available:false});assert.equal(removed.result.error,undefined);assert.ok(removed.filters.some(([k,v])=>k==='user_id'&&v==='self'));assert.ok(removed.filters.some(([k,v])=>k==='workspace_id'&&v==='workspace'));assert.ok(removed.filters.some(([k,v])=>k==='drive_ntx_event_id'&&v==='announced-apex-2027-01-16'));
 for(const opts of [{user:false},{member:false},{available:false},{event:'bad?event'},{save:'true'}]){const r=await run(opts);assert.ok(r.result.error);assert.equal(r.touched.includes('event_interests'),false);}
 const failed=await run({dbError:true});assert.ok(failed.result.error);assert.equal(failed.refresh.length,0);
 for(const r of [added,removed,failed]){assert.equal(r.touched.includes('events'),false);assert.equal(r.touched.includes('sessions'),false);}
 console.log('Interest saves/removals: personal scope, idempotency, invalid/auth failures, unavailable-event removal, write errors and zero tracker/session writes passed.');
})().catch(e=>{console.error(e);process.exit(1)});
