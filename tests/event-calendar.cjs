const fs = require('fs'), vm = require('vm'), ts = require('typescript'), assert = require('node:assert/strict');
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
function load(path, dependencies = {}) {
  const result = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports: result.exports, Intl, Date, Set, require: name => dependencies[name] || require(name) });
  return result.exports;
}
const logic = load('lib/event-calendar.ts');
assert.equal(logic.calendarDate('2027-01-30'), '2027-01-30');
assert.equal(logic.calendarDate('2027-01-31T02:00:00Z'), '2027-01-30');
assert.equal(logic.calendarDate('2027-07-01T04:30:00Z'), '2027-06-30');
assert.equal(logic.calendarDate('2027-03-14T08:01:00Z'), '2027-03-14');
assert.equal(logic.moveMonth('2027-12', 1), '2028-01');
assert.equal(logic.moveMonth('2027-01', -1), '2026-12');
assert.equal(logic.monthDays('2028-02').filter(Boolean).length, 29);
assert.equal(logic.monthDays('2027-02').filter(Boolean).length, 28);
assert.equal(logic.monthDays('2027-01')[5], '2027-01-01');
assert.equal(logic.monthDays('2027-01').length % 7, 0);
const weekend = { startDate: '2027-01-30', endDate: '2027-02-01' };
for (const day of ['2027-01-30', '2027-01-31', '2027-02-01']) assert.ok(logic.occursOn(weekend, day));
assert.ok(!logic.occursOn(weekend, '2027-02-02'));

const Calendar = load('app/dashboard/EventCalendar.tsx', { '@/lib/event-calendar': logic }).default;
const html = renderToStaticMarkup(React.createElement(Calendar, {
  items: [{ id: 'nasa', title: 'NASA at Houston', subtitle: 'MSR Houston', startDate: '2099-01-30', endDate: '2099-02-01', status: 'going' }],
  renderEvent: id => React.createElement('a', { key: id, href: '/dashboard/events/' + id }, 'View my event'),
}));
assert.match(html, /January 2099/);
assert.equal((html.match(/<strong>NASA at Houston<\/strong>/g) || []).length, 2);
assert.match(html, /✓ Going/);
assert.match(html, /View my event/);
assert.match(html, /aria-label="Next month"/);

// Exercise the calendar branch of Discover with real shared details/actions.
const calendarReact = { ...React, useState: initial => React.useState(initial === 'list' ? 'calendar' : initial) };
const attendance = load('lib/discover-attendance.ts');
const Discover = load('app/dashboard/discover/DiscoverEvents.tsx', {
  react: calendarReact, '../EventCalendar': { default: Calendar }, '@/lib/event-calendar': logic,
  '@/lib/discover-attendance': attendance, '@/lib/drive-ntx': { safeDriveLink: value => value },
  './actions': { setEventInterest: async () => ({}) },
}).default;
const discover = renderToStaticMarkup(React.createElement(Discover, {
  events: [{ id: 'nasa', title: 'NASA Houston', venue: 'MSR Houston', organizer: 'NASA Texas', start_at: '2099-01-30T12:00:00Z', end_at: '2099-01-31T23:59:59Z', source_url: 'https://members.drivenasa.com/events/5522', registration_url: null }],
  selected: [], canPlan: true, initialInterested: ['nasa'], interestsAvailable: true,
}));
assert.match(discover, /aria-label="Event calendar"/);
assert.match(discover, /★ Interested/);
assert.match(discover, /Remove interest in NASA Houston/);
assert.match(discover, /Plan to attend/);
assert.match(discover, /View source/);
const MyEvents = load('app/dashboard/EventIndex.tsx', {
  react: calendarReact, './EventCalendar': { default: Calendar },
  '@/lib/grid': load('lib/grid.ts'),
}).default;
const myEvents = renderToStaticMarkup(React.createElement(MyEvents, { events: [{
  id: 'my-race', business_id: 'EV-1', event_date: '2099-01-30', event_name: 'My NASA weekend',
  track_name: 'MSR Houston', configuration_name: 'CCW', organization_name: 'NASA Texas',
  status: 'planned', tire_set_id: null, front_pad_set_id: null, rear_pad_set_id: null,
  vehicles: { name: 'Cheese Ball' }, sessions: [],
}] }));
assert.match(myEvents, /aria-label="Event calendar"/);
assert.match(myEvents, /Cheese Ball/);
assert.match(myEvents, /href="\/dashboard\/events\/my-race"/);
console.log('Calendar: timezone boundaries, leap years, month navigation, multi-day weekends and Discover actions passed.');
