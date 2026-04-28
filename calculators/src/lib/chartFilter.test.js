import test from 'node:test';
import assert from 'node:assert/strict';
import { rowIndicesNearOptimal } from './chartFilter.js';

test('rowIndicesNearOptimal keeps both rows when competitive at different points', () => {
  const rowData = [
    [10, 5],
    [5, 10],
  ];
  const keep = rowIndicesNearOptimal(rowData);
  assert.deepEqual(keep, [true, true]);
});

test('rowIndicesNearOptimal drops dominated row', () => {
  const rowData = [
    [10, 10],
    [50, 50],
  ];
  const keep = rowIndicesNearOptimal(rowData);
  assert.equal(keep[0], true);
  assert.equal(keep[1], false);
});
