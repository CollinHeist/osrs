import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMethodTimes, pickBestRow } from './calculatorEngine.js';

test('computeMethodTimes: negative GP/XP costs GP and adds gather time', () => {
  const r = computeMethodTimes({ xpNeeded: 1000, gpxp: -10, xphr: 100000, gphr: 1_000_000 });
  assert.equal(r.totalCost, 10_000);
  assert.equal(r.gatherH, 0.01);
  assert.equal(r.trainH, 0.01);
  assert.ok(Math.abs(r.totalH - 0.02) < 1e-9);
});

test('computeMethodTimes: positive GP/XP has zero gather time', () => {
  const r = computeMethodTimes({ xpNeeded: 1000, gpxp: 5, xphr: 100000, gphr: 1_000_000 });
  assert(r.totalCost < 0);
  assert.equal(r.gatherH, 0);
  assert.equal(r.trainH, 0.01);
});

test('pickBestRow chooses lowest totalH', () => {
  const rows = [
    { id: 'a', totalH: 5 },
    { id: 'b', totalH: 3 },
    { id: 'c', totalH: 9 },
  ];
  assert.equal(pickBestRow(rows).id, 'b');
});
