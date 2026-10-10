// Keep each engine's measurements separate and preserve the source row index.
export function sensorSeries(csv, selectedRow, sensor) {
  if (!csv?.rows[selectedRow]) return { points: [], unit: null, duplicates: false };
  const timeColumn = csv.headers.indexOf('time_cycles');
  const sensorColumn = csv.headers.indexOf(sensor);
  const unitColumn = csv.headers.indexOf('unit_number');
  const unit = unitColumn < 0 ? null : csv.rows[selectedRow][unitColumn];
  const points = csv.rows.flatMap((row, rowIndex) => {
    if (unitColumn >= 0 && row[unitColumn] !== unit) return [];
    return [{ cycle: Number(row[timeColumn]), value: Number(row[sensorColumn]), rowIndex }];
  }).sort((a, b) => a.cycle - b.cycle || a.rowIndex - b.rowIndex);
  const duplicates = new Set(points.map((point) => point.cycle)).size !== points.length;
  return { points, unit, duplicates };
}
