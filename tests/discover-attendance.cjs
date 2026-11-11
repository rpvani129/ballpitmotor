const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict');
const m={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/discover-attendance.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:m.exports});
const {discoverAttendance:status,matchesAttendance:matches}=m.exports;
const interested=new Set(['possible','registered']);
// Several cloned tracker days share one source event, and must count once.
const going=new Set([{sourceId:'registered'},{sourceId:'registered'},{sourceId:'committed'}].map(item=>item.sourceId));
const events=['possible','registered','committed','other'];
assert.equal(status('registered',interested,going),'going');
assert.equal(status('possible',interested,going),'interested');
assert.equal(status('other',interested,going),'none');
const filter=mode=>events.filter(id=>matches(status(id,interested,going),mode));
assert.deepEqual(filter('interested'),['possible']);
assert.deepEqual(filter('going'),['registered','committed']);
assert.deepEqual(filter('both'),['possible','registered','committed']);
assert.deepEqual(filter('all'),events);
// Removing/cancelling the final linked day reveals the existing bookmark.
assert.equal(status('registered',interested,new Set()),'interested');
assert.equal(status('committed',interested,new Set()),'none');
console.log('Discover attendance: Going precedence, Interested/Going/Both filters, deduped weekends and retained bookmarks passed.');
