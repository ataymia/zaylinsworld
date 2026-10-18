import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AcceptanceTelemetry } from '../src/runtime/AcceptanceTelemetry.js';

let time = 0;
const telemetry = new AcceptanceTelemetry({ clock: () => time, sampleIntervalMs: 1000 });
telemetry.setBuild({ commit: 'abc1234', version: 'test' });
telemetry.start('five-minute-stationary');

for (const frameMs of [16, 17, 20, 40, 60]) {
  time += frameMs;
  telemetry.frame(frameMs);
}
telemetry.recordInput('W');
telemetry.recordInput('I', 'uiOpen');
telemetry.recordSave(true, { area: 'city' });
telemetry.recordSave(true, { area: 'home' });
telemetry.recordSave(false, { area: 'garage', inCar: false });
telemetry.recordGraphics('low', { renderScale: 0.7 });
telemetry.recordGraphics('high', { renderScale: 1 });
telemetry.recordInteriorEntry('home', { stations: 2 });
telemetry.recordInteriorExit('home', { returnDistance: 0.25 });
telemetry.recordInteriorEntry('school', { stations: 3 });
telemetry.recordInteriorFailure('school', 'exit', new Error('test recovery'));
telemetry.recordInteriorExit('school', { returnDistance: 4.5, recovered: true });
telemetry.recordError('repeatable test error', 'test');
telemetry.recordError('repeatable test error', 'test');

assert.equal(telemetry.sampleDue(), true, 'a new session should take an immediate deployed snapshot');
telemetry.sample({ area: 'city', heapMb: 100, render: { calls: 500, triangles: 100000 } });
time += 999;
assert.equal(telemetry.sampleDue(), false, 'runtime evidence sampling must remain low frequency');
time += 1;
assert.equal(telemetry.sampleDue(), true);
telemetry.sample({ area: 'school', heapMb: 104, render: { calls: 420, triangles: 90000 } });

const report = telemetry.stop('test-complete');
assert.equal(report.build.commit, 'abc1234');
assert.equal(report.session.label, 'five-minute-stationary');
assert.equal(report.session.active, false);
assert.equal(report.performance.frames, 5);
assert.equal(report.performance.over33Ms, 2);
assert.equal(report.performance.over50Ms, 1);
assert.equal(report.performance.maxFrameMs, 60);
assert.equal(report.saves.attempts, 3);
assert.equal(report.saves.successes, 2);
assert.equal(report.saves.failures, 1);
assert.deepEqual(report.saves.byArea, { city: 1, home: 1, garage: 1 });
assert.deepEqual(report.inputs, { w: 1, i: 1 });
assert.deepEqual(report.blockedInputs, { uiOpen: 1 });
assert.equal(report.graphics.changes, 2);
assert.equal(report.interiors.home.entries, 1);
assert.equal(report.interiors.home.exits, 1);
assert.equal(report.interiors.home.unsafeReturns, 0);
assert.equal(report.interiors.school.failures, 1);
assert.equal(report.interiors.school.recoveries, 1);
assert.equal(report.interiors.school.unsafeReturns, 1);
assert.equal(report.runtimeSamples.length, 2);
assert.equal(report.latest.area, 'school');
const repeated = report.errors.find((entry) => entry.source === 'test');
assert.equal(repeated.count, 2, 'duplicate errors should retain occurrence count without unbounded rows');

telemetry.start('follow-up', { preserveErrors: true });
assert.equal(telemetry.snapshot().errors.length, report.errors.length, 'follow-up sessions may retain boot/runtime errors');
assert.equal(telemetry.snapshot().saves.attempts, 0, 'a new acceptance session must reset behavioral counters');
for (let index = 0; index < 300; index++) telemetry.mark('bounded-event', { index });
assert.equal(telemetry.snapshot().events.length, 240, 'long soaks must keep a bounded event history');

const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const debug = fs.readFileSync(new URL('../src/debug.js', import.meta.url), 'utf8');
const interiors = fs.readFileSync(new URL('../src/interiors.js', import.meta.url), 'utf8');
const vite = fs.readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
const pagesWorkflow = fs.readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
assert.equal([...interiors.matchAll(/byId\.[a-z]+\s*=\s*\{/g)].length, 12, 'the deployed transition cycle must cover all twelve interiors');
assert.match(main, /acceptanceTelemetry\.frame\(rawFrameMs\)/, 'the real animation loop must capture frame evidence');
assert.match(main, /acceptanceTelemetry\.recordSave\(saved,/, 'real save outcomes must enter the evidence report');
assert.match(main, /acceptanceTelemetry\.recordInteriorEntry\(id,/, 'real entry transitions must be recorded');
assert.match(main, /acceptanceTelemetry\.recordInteriorExit\(interiorId,/, 'real exit transitions must be recorded');
assert.match(main, /async function runInteriorAcceptance/, 'the deployed all-interior lifecycle runner must exist');
assert.match(main, /ids\.length === 12/, 'the lifecycle runner may not silently pass a partial interior catalog');
assert.match(main, /acceptance:\s*Object\.freeze\(\{/, 'window.ZW must expose bounded acceptance controls');
assert.match(debug, /acceptanceTelemetry\.recordError\(text, 'runtime'\)/, 'visible runtime errors must also enter evidence');
assert.match(debug, /Copy acceptance/, 'the debug panel must let a playtester copy evidence without console work');
assert.match(vite, /readServiceWorkerSource\(\)/, 'every production build path must emit the tracked service worker');
assert.match(vite, /git show HEAD:public\/sw\.js/, 'sparse validation builds must still use the tracked worker source');
assert.doesNotMatch(pagesWorkflow, /cp public\/sw\.js dist\//,
  'the Pages assembly step must not overwrite the version-stamped service worker');

console.log('Starter Town deployed-acceptance telemetry passed:');
console.log('- frame spikes, runtime samples, saves, graphics, inputs, and errors remain bounded and copyable');
console.log('- all twelve real interior lifecycles are addressable through one deployed transition runner');
console.log('- automatic evidence does not replace the remaining visual, driving, pursuit, or soak judgment');
