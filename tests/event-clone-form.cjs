const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const m={exports:{}};
const code=ts.transpileModule(fs.readFileSync('app/dashboard/events/new/NewEventForm.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
vm.runInNewContext(code,{exports:m.exports,require:n=>n==='@/app/actions'?{createEvent:()=>{}}:require(n)});
const html=renderToStaticMarkup(React.createElement(m.exports.default,{
 mode:'clone',cloneId:'friday',initial:{vehicle_id:'car',event_date:'2027-04-10',event_name:'Weekend',track_id:'track',configuration_id:'config',tire_set_id:'old-tires',front_pad_set_id:'old-front',notes:'Friday setup'},
 vehicles:[{id:'car',name:'Golf Ball'}],tracks:[{id:'track',name:'ECR',track_configurations:[{id:'config',name:'2.7 CCW',is_active:true}]}],
 tires:[{id:'old-tires',business_id:'T1',vehicle_id:'car',manufacturer:'Toyo',model:'RR',is_current:false},{id:'new-tires',business_id:'T2',vehicle_id:'car',manufacturer:'Toyo',model:'RR',is_current:true}],
 pads:[{id:'old-front',business_id:'P1',vehicle_id:'car',axle:'front',manufacturer:'Cobalt',model:'XR',is_current:false}],eventTypes:[],teams:[],defaultTeamId:'',defaultDriverName:'Driver'
}));
assert.match(html,/name="event_date"[^>]*value="2027-04-10"/);
assert.match(html,/<details class="clone-setup">/);
assert.match(html,/<option value="old-tires" selected=""/);
assert.match(html,/<option value="old-front" selected=""/);
assert.match(html,/Save cloned event/);
assert.match(html,/Friday setup/);
assert.doesNotMatch(html,/name="starting_odometer_miles"/);
console.log('Clone form rendering: next-day date, collapsed setup, exact assigned consumables and one-save action passed.');
