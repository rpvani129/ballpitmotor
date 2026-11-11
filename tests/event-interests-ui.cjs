const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const m={exports:{}};
const code=ts.transpileModule(fs.readFileSync('app/dashboard/discover/DiscoverEvents.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
vm.runInNewContext(code,{exports:m.exports,Intl,Date,Set,require:n=>n==='./actions'?{setEventInterest:async()=>({})}:n==='@/lib/drive-ntx'?{safeDriveLink:v=>v}:require(n)});
const html=renderToStaticMarkup(React.createElement(m.exports.default,{
 events:[{id:'apex',title:'APEX at ECR',organizer:'APEX',venue:'ECR',start_at:'2027-01-16T12:00:00Z',end_at:null,source_url:'https://drive.ballpitmotor.com',registration_url:null}],
 selected:[],canPlan:true,initialInterested:['apex'],interestsAvailable:true
}));
assert.match(html,/Interested \(1\)/);
assert.match(html,/aria-pressed="true" aria-label="Remove interest in APEX at ECR"/);
assert.match(html,/★ Interested/);
assert.match(html,/Plan to attend/);
assert.match(html,/Plan to attend creates a tracker event after you register/);
assert.doesNotMatch(html,/<form/);
console.log('Discover UI: Interested flag/count, remove action, independent plan action and registration wording passed.');
