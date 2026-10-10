import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine, ReferenceDot } from 'recharts';
import { engineHistory, sensorSeries, numericValue } from '../services/timeSeries';

const format = (value) => value === null ? 'Unavailable' : String(Number(value.toFixed(6)));

export default function SensorTimeSeries({ csv, selectedRow, onSelectRow, disabled }) {
  const [chosenSensor, setChosenSensor] = useState('sensor_2');
  const available = engineHistory(csv, selectedRow);
  const sensor = available.sensors.includes(chosenSensor) ? chosenSensor : available.sensors[0] || '';
  const { points, unit, units, unitColumn, timeColumn, engineRows, selectedCycle, current, stats, invalid, duplicateRows, error } = sensorSeries(csv, selectedRow, sensor);
  const selectEngine = (nextUnit) => {
    const rows = csv.rows.flatMap((row, rowIndex) => row[unitColumn] === nextUnit && numericValue(row[timeColumn]) !== null ? [{ rowIndex, cycle: Number(row[timeColumn]) }] : []);
    rows.sort((a, b) => b.cycle - a.cycle);
    const rowIndex = rows[0]?.rowIndex ?? csv.rows.findIndex((row) => row[unitColumn] === nextUnit);
    if (rowIndex >= 0) onSelectRow(csv, rowIndex);
  };
  return (
    <section className="sensor-history">
      <h2>2. Explore engine history</h2>
      <p className="sensor-history-description">Recorded sensor values up to your selected cycle.</p>
      {!csv ? <p className="muted">Your engine history will appear here after you add data.</p> : <>
        <div className="sensor-history-controls">
          {unitColumn >= 0 && <label>Engine<select value={unit ?? ''} disabled={disabled} onChange={(event) => selectEngine(event.target.value)}>
            {!units.includes(unit) && <option value="">Choose an engine</option>}
            {units.map((engine) => <option key={engine} value={engine}>{engine}</option>)}
          </select></label>}
          <label>Operating cycle<select value={engineRows.some((row) => row.rowIndex === selectedRow) ? selectedRow : ''} disabled={disabled || !engineRows.length} onChange={(event) => onSelectRow(csv, Number(event.target.value))}>
            {!engineRows.some((row) => row.rowIndex === selectedRow) && <option value="">Choose a valid cycle</option>}
            {engineRows.map(({ cycle, rowIndex }) => <option key={rowIndex} value={rowIndex}>Cycle {cycle}</option>)}
          </select></label>
          <label>Sensor<select value={sensor} disabled={!available.sensors.length} onChange={(event) => setChosenSensor(event.target.value)}>{available.sensors.map((name) => <option key={name} value={name}>{name.replace('sensor_', 'Sensor ')}</option>)}</select></label>
        </div>
        {unitColumn < 0 && <p className="sensor-history-notice">No engine ID found. Use readings from one engine only.</p>}
        {error ? <p role="alert">{error}</p> : <>
          <p className="muted">{points.length} readings{unit !== null ? ` · Engine ${unit}` : ''} · Up to cycle {selectedCycle}</p>
          {invalid > 0 && <p role="status">Excluded {invalid} missing or non-numeric {sensor} measurements.</p>}
          {duplicateRows > 0 && <p role="status">Skipped {duplicateRows} readings with duplicate cycles.</p>}
          {points.length === 1 && <p>One reading available. Add more cycles to see a trend.</p>}
          {!current && <p role="status">The selected reading is invalid or duplicated, so its point is hidden.</p>}
          {!points.length ? <p>No valid sensor measurements are available up to this cycle.</p> : <>
            <dl className="sensor-history-stats">
              {Object.entries({ 'Selected value': stats.current, 'First value': stats.initial, Change: stats.change }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{label === 'Change' && value > 0 ? '+' : ''}{format(value)}</dd></div>)}
            </dl>
            <div role="img" aria-label={`${sensor} history for ${unit === null ? 'uploaded engine' : `engine ${unit}`} through cycle ${selectedCycle}`} className="sensor-history-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 30, right: 24, bottom: 28, left: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="cycle" type="number" domain={[points[0].cycle, selectedCycle]} label={{ value: 'Operating Cycle', position: 'bottom', offset: 8 }} />
                  <YAxis domain={['auto', 'auto']} tickFormatter={(value) => Number(value.toPrecision(5))} width={80} label={{ value: sensor, angle: -90, position: 'insideLeft', offset: -15 }} />
                  <Tooltip labelFormatter={(cycle) => `Operating Cycle ${cycle}`} formatter={(value) => [String(value), sensor]} />
                  <ReferenceLine x={selectedCycle} stroke="#ea580c" strokeDasharray="4 4" label={{ value: 'Selected cycle', position: 'insideTopRight', fill: '#9a3412', fontSize: 11 }} />
                  <Line type="linear" dataKey="value" name={sensor} stroke="#0284c7" strokeWidth={2} dot={points.length <= 50 ? { r: 3 } : false} activeDot={{ r: 5 }} isAnimationActive={false} />
                  {current && <ReferenceDot x={current.cycle} y={current.value} r={6} fill="#ea580c" stroke="#fff" strokeWidth={2} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <details className="quiet-details"><summary>Chart details</summary><p>Measured history only; no future sensor values are predicted. Sensor changes alone do not explain the remaining-life estimate.</p><p>Minimum: {format(stats.min)} · Maximum: {format(stats.max)} · Average: {format(stats.mean)}</p></details>
          </>}
        </>}
      </>}
    </section>
  );
}
