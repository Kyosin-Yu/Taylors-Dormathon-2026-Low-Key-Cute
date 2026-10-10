import test from 'node:test';
import assert from 'node:assert/strict';
import { engineHistory, sensorSeries, numericValue } from './timeSeries.js';

const csv = (rows, headers = ['unit_number', 'time_cycles', 'sensor_2']) => ({ headers, rows });

test('100+ unsorted cycles are sorted and retain source row identity', () => {
  const data = csv(Array.from({ length: 150 }, (_, i) => ['1', String(150 - i), String(600 + 150 - i)]));
  const series = sensorSeries(data, 0, 'sensor_2');
  assert.equal(series.points.length, 150);
  assert.deepEqual(series.points[0], { cycle: 1, value: 601, rowIndex: 149 });
  assert.equal(series.current.cycle, 150);
});

test('engine filtering keeps independent histories and statistics', () => {
  const data = csv([['1', '2', '642'], ['2', '1', '900'], ['1', '1', '640'], ['2', '2', '902']]);
  assert.deepEqual(engineHistory(data, 0).units, ['1', '2']);
  assert.deepEqual(sensorSeries(data, 0, 'sensor_2').points.map((p) => p.value), [640, 642]);
  assert.deepEqual(sensorSeries(data, 3, 'sensor_2').points.map((p) => p.value), [900, 902]);
  assert.equal(sensorSeries(data, 0, 'sensor_2').stats.mean, 641);
});

test('analyzing cycle 50 excludes cycles 51–150 from plot and statistics', () => {
  const data = csv(Array.from({ length: 150 }, (_, i) => ['3', String(i + 1), String(i + 1)]));
  const series = sensorSeries(data, 49, 'sensor_2');
  assert.equal(series.points.length, 50);
  assert.equal(series.points.at(-1).cycle, 50);
  assert.equal(series.stats.max, 50);
  assert.equal(series.stats.mean, 25.5);
  assert.equal(series.stats.change, 49);
});

test('one-row CSV remains exactly one point', () => {
  const series = sensorSeries(csv([['126', '642.8']], ['time_cycles', 'sensor_2']), 0, 'sensor_2');
  assert.deepEqual(series.points, [{ cycle: 126, value: 642.8, rowIndex: 0 }]);
  assert.equal(series.unit, null);
  assert.equal(series.stats.change, 0);
});

test('missing and non-numeric measurements are excluded without coercing blanks to zero', () => {
  const data = csv([['1', '1', ''], ['1', '2', 'oops'], ['1', '3', '642'], ['1', '4', 'NaN'], ['1', '5', 'Infinity']]);
  const series = sensorSeries(data, 4, 'sensor_2');
  assert.equal(series.invalid, 4);
  assert.equal(series.points.length, 1);
  assert.equal(series.current, null);
  assert.equal(series.stats.current, null);
  assert.equal(numericValue(' '), null);
  assert.equal(numericValue('0'), 0);
});

test('duplicate cycles omit all ambiguous observations but retain other history', () => {
  const data = csv([['1', '1', '640'], ['1', '2', '641'], ['1', '2', '999'], ['1', '3', '643']]);
  const series = sensorSeries(data, 3, 'sensor_2');
  assert.equal(series.duplicateRows, 2);
  assert.deepEqual(series.points.map((p) => p.cycle), [1, 3]);
});

test('future invalid or duplicate measurements do not affect current history', () => {
  const series = sensorSeries(csv([['1', '1', '640'], ['1', '2', ''], ['1', '2', '999']]), 0, 'sensor_2');
  assert.equal(series.duplicateRows, 0);
  assert.equal(series.invalid, 0);
});

test('missing time, empty file, invalid cycles, and missing engine identity produce errors', () => {
  assert.match(engineHistory(csv([['1', '640']], ['unit_number', 'sensor_2']), 0).error, /Missing time_cycles/);
  assert.match(engineHistory(null, 0).error, /no data rows/);
  assert.match(engineHistory(csv([['1', 'oops', '640']]), 0).error, /invalid operating cycle/);
  assert.match(engineHistory(csv([['', '1', '640']]), 0).error, /no engine identity/);
  assert.deepEqual(sensorSeries(null, 0, 'sensor_2').points, []);
});

test('available sensors come from CSV columns, including non-default sensors', () => {
  const data = csv([['1', '30', '4']], ['unit_number', 'time_cycles', 'sensor_99']);
  assert.deepEqual(engineHistory(data, 0).sensors, ['sensor_99']);
  assert.equal(sensorSeries(data, 0, 'sensor_99').current.value, 4);
});
