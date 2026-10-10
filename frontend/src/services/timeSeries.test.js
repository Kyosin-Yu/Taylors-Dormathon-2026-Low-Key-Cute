import test from 'node:test';
import assert from 'node:assert/strict';
import { sensorSeries } from './timeSeries.js';

test('time series sorts cycles without mixing engines or losing source row identity', () => {
  const csv = { headers: ['unit_number', 'time_cycles', 'sensor_2'], rows: [['1', '3', '643'], ['2', '1', '700'], ['1', '1', '641']] };
  const series = sensorSeries(csv, 0, 'sensor_2');
  assert.deepEqual(series.points, [{ cycle: 1, value: 641, rowIndex: 2 }, { cycle: 3, value: 643, rowIndex: 0 }]);
  assert.equal(series.unit, '1');
  assert.equal(series.duplicates, false);
});

test('repeated cycles are flagged rather than presented as one continuous trajectory', () => {
  const csv = { headers: ['time_cycles', 'sensor_2'], rows: [['1', '641'], ['1', '642']] };
  assert.equal(sensorSeries(csv, 0, 'sensor_2').duplicates, true);
  assert.deepEqual(sensorSeries(null, 0, 'sensor_2').points, []);
});
