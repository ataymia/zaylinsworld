import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile('public/minigames/lineup-lab.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'Lineup Lab must have an executable script');
new Function(script);
assert.match(html, /touch-action:none/, 'touch cutting must prevent browser gestures');
assert.match(script, /let activeCutPointer = null/, 'one cutting pointer must own each stroke');
assert.match(script, /activeCutPointer !== null && ev\.pointerId !== activeCutPointer/, 'second pointer cannot steer the active blade');
assert.match(script, /ev\.pointerType === 'mouse' && ev\.button !== 0/, 'right click cannot start a cut');
assert.match(script, /canvas\.setPointerCapture\?\.\(ev\.pointerId\)/, 'active stroke must capture its pointer');
assert.match(script, /canvas\.addEventListener\('pointercancel', ev => stopCut\(ev\.pointerId\)\)/, 'canceled touches must release cutting');
assert.match(script, /canvas\.addEventListener\('lostpointercapture'/, 'interrupted capture must stop cutting');
assert.match(script, /window\.addEventListener\('blur'/, 'tab switching must stop cutting');
assert.doesNotMatch(script, /canvas\.addEventListener\('touch(?:start|move)'/, 'duplicate touch event cutting must not return');
assert.match(script, /if\s*\(state\.pointer\.down\)\s*cutAt\(/, 'continuous cutting must remain connected to the animation loop');
assert.match(script, /ui\.startBtn\.onclick=\(\)=>\{if\(state\.finished\) resetGame\(\);state\.running=true/, 'starting after a completed cut must reset the timer, hair, and result before replay');
console.log('[lineup-lab] pointer ownership, touch cancellation, continuous cutting and script syntax verified');
