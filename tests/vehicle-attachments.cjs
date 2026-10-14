const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, imports) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports: module.exports, require: name => imports[name] ?? require(name), crypto: require('node:crypto').webcrypto, window: { confirm: () => true } });
  return module.exports;
}
const files = load('lib/vehicle-attachment-files.ts', {});
for (const extension of ['pdf','jpg','jpeg','png','webp','heic','csv','txt','docx','xlsx']) assert.ok(files.vehicleAttachmentFileDetails({ name: `file.${extension}`, size: 26214400 }));
for (const [name,size] of [['file.pdf',0],['file.pdf',26214401],['file.exe',1],['file.html',1]]) assert.equal(files.vehicleAttachmentFileDetails({ name,size }), null);
const visit = (node, predicate) => {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) { const match = visit(child, predicate); if (match) return match; }
  return null;
};
async function uploadCase({recordId, dbError, uploadError, noUser, size = 1} = {}) {
  const calls = []; let metadata;
  const storage = { upload: async (path,file,options) => { calls.push('upload'); assert.ok(path.startsWith(`workspace/vehicle/${recordId ?? 'vehicle'}/`)); assert.equal(options.upsert,false); return {error:uploadError}; }, remove: async () => { calls.push('cleanup'); return {error:null}; } };
  const client = {auth:{getUser:async()=>({data:{user:noUser?null:{id:'user'}}})},storage:{from:bucket=>{assert.equal(bucket,'vehicle-attachments');return storage;}},from:table=>{assert.equal(table,'vehicle_attachments');return {insert:async row=>{metadata=row;calls.push('insert');return {error:dbError};}};}};
  const manager = load('app/dashboard/vehicles/[id]/VehicleAttachments.tsx', {'react':{useState:initial=>[typeof initial==='function'?initial():initial,()=>{}]},'next/navigation':{useRouter:()=>({push:()=>calls.push('navigate'),refresh:()=>calls.push('refresh')})},'@/lib/supabase/client':{createClient:()=>client},'@/lib/vehicle-attachment-files':files}).default;
  const view=manager({workspaceId:'workspace',vehicleId:'vehicle',recordId,uploadOnly:true,canEdit:true});
  const form=visit(view,node=>node.type==='form');
  await form.props.action({get:name=>({file:{name:'test.pdf',size},title:' Test document ',category:'Receipt',notes:' Notes '}[name])});
  return {calls,metadata};
}
(async()=>{
  let result=await uploadCase(); assert.deepEqual(result.calls,['upload','insert','navigate','refresh']); assert.equal(result.metadata.maintenance_record_id,null); assert.equal(result.metadata.title,'Test document'); assert.equal(result.metadata.notes,'Notes');
  result=await uploadCase({recordId:'record'}); assert.equal(result.metadata.maintenance_record_id,'record');
  result=await uploadCase({dbError:new Error('Metadata failed')}); assert.deepEqual(result.calls,['upload','insert','cleanup']);
  result=await uploadCase({uploadError:new Error('Storage failed')}); assert.deepEqual(result.calls,['upload','cleanup']);
  result=await uploadCase({noUser:true}); assert.deepEqual(result.calls,[]);
  result=await uploadCase({size:26214401}); assert.deepEqual(result.calls,[]);
  console.log('Attachment file validation, upload scopes, failure cleanup, auth and size checks passed.');
})().catch(error=>{console.error(error);process.exit(1);});
