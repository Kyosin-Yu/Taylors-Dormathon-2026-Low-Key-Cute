export const numericValue = (value) => value == null || String(value).trim() === '' || !Number.isFinite(Number(value)) ? null : Number(value);

export function engineHistory(csv, selectedRow) {
  const rows = csv?.rows || [], headers = csv?.headers || [];
  const unitColumn = headers.indexOf('unit_number'), timeColumn = headers.indexOf('time_cycles');
  const sensors = headers.filter((name) => /^sensor_\w+$/.test(name));
  const units = unitColumn < 0 ? [] : [...new Set(rows.map((row) => row[unitColumn]).filter((unit) => unit != null && String(unit).trim() !== ''))];
  const unit = unitColumn < 0 ? null : rows[selectedRow]?.[unitColumn];
  const selectedCycle = numericValue(rows[selectedRow]?.[timeColumn]);
  const engineRows = rows.flatMap((row, rowIndex) => {
    const cycle = numericValue(row[timeColumn]);
    if (cycle === null || (unitColumn >= 0 && (!units.includes(unit) || row[unitColumn] !== unit))) return [];
    return [{ cycle, rowIndex }];
  }).sort((a, b) => a.cycle - b.cycle || a.rowIndex - b.rowIndex);
  const error = !rows.length ? 'The CSV has no data rows.' : timeColumn < 0 ? 'Missing time_cycles column. Operating cycles are required for sensor history.' : selectedCycle === null ? 'The selected row has an invalid operating cycle. Choose a valid cycle.' : unitColumn >= 0 && !units.includes(unit) ? 'The selected row has no engine identity. Choose an Engine / Unit.' : !sensors.length ? 'No sensor_* columns are available.' : '';
  return { sensors, units, unit, unitColumn, timeColumn, engineRows, selectedCycle, error };
}

// Neither future cycles nor another engine can enter the chart or its statistics.
export function sensorSeries(csv, selectedRow, sensor) {
  const history = engineHistory(csv, selectedRow);
  const sensorColumn = csv?.headers.indexOf(sensor) ?? -1;
  const candidates = history.selectedCycle === null ? [] : history.engineRows.filter((row) => row.cycle <= history.selectedCycle);
  const counts = new Map();
  candidates.forEach(({ cycle }) => counts.set(cycle, (counts.get(cycle) || 0) + 1));
  let invalid = 0, duplicateRows = 0;
  const points = candidates.flatMap(({ cycle, rowIndex }) => {
    // Exclude all conflicting duplicate rows instead of choosing a value silently.
    if (counts.get(cycle) > 1) { duplicateRows++; return []; }
    const value = numericValue(csv.rows[rowIndex][sensorColumn]);
    if (value === null) { invalid++; return []; }
    return [{ cycle, value, rowIndex }];
  });
  const values = points.map((point) => point.value);
  const current = points.find((point) => point.rowIndex === selectedRow) ?? null;
  const range = values.reduce((acc, value) => ({ min: Math.min(acc.min, value), max: Math.max(acc.max, value), sum: acc.sum + value }), { min: Infinity, max: -Infinity, sum: 0 });
  const stats = points.length ? { current: current?.value ?? null, initial: values[0], change: current ? current.value - values[0] : null, min: range.min, max: range.max, mean: range.sum / values.length } : null;
  return { ...history, points, current, stats, invalid, duplicateRows, duplicates: duplicateRows > 0 };
}
