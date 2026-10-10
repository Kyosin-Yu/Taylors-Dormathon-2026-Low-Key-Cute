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
      <h3>Sensor History Over Operating Cycles</h3>
      <p className="sensor-history-description">Measured sensor values up to the selected operating cycle. This chart shows historical engine behaviour, not future predictions.</p>
      {!csv ? <p>Upload a CSV with multiple cycles to explore a trend. <a href="/cmapss-timeseries-sample.csv" download>Download time series sample</a></p> : <>
        <div className="sensor-history-controls">
          {unitColumn >= 0 && <label>Engine / Unit<select value={unit ?? ''} disabled={disabled} onChange={(event) => selectEngine(event.target.value)}>
            {!units.includes(unit) && <option value="">Choose an engine</option>}
            {units.map((engine) => <option key={engine} value={engine}>{engine}</option>)}
          </select></label>}
          <label>Analyze at Cycle<select value={engineRows.some((row) => row.rowIndex === selectedRow) ? selectedRow : ''} disabled={disabled || !engineRows.length} onChange={(event) => onSelectRow(csv, Number(event.target.value))}>
            {!engineRows.some((row) => row.rowIndex === selectedRow) && <option value="">Choose a valid cycle</option>}
            {engineRows.map(({ cycle, rowIndex }) => <option key={rowIndex} value={rowIndex}>Cycle {cycle} · Row {rowIndex + 1}</option>)}
          </select></label>
          <label>Sensor<select value={sensor} disabled={!available.sensors.length} onChange={(event) => setChosenSensor(event.target.value)}>{available.sensors.map((name) => <option key={name}>{name}</option>)}</select></label>
        </div>
        {unitColumn < 0 && <p className="sensor-history-notice">Engine identity cannot be distinguished because unit_number is missing.{csv.rows.length > 1 ? ' This file is treated as one engine; only use rows from the same engine.' : ''}</p>}
        {error ? <p role="alert">{error}</p> : <>
          <p>{points.length} valid measurements{unit !== null ? ` for engine ${unit}` : ''} through cycle {selectedCycle}. <strong>Current / Analyzed Cycle: {selectedCycle}</strong></p>
          {invalid > 0 && <p role="status">Excluded {invalid} missing or non-numeric {sensor} measurements.</p>}
          {duplicateRows > 0 && <p role="status">Excluded {duplicateRows} rows with repeated cycles for this engine. Correct duplicate cycles to include these measurements.</p>}
          {points.length === 1 && <p>Only one measurement is available for this engine at or before the analyzed cycle. Multiple operating cycles are required to visualize a sensor trend.</p>}
          {!current && <p role="status">The analyzed sensor value is missing, invalid, or has a duplicate cycle; its point is excluded.</p>}
          {!points.length ? <p>No valid sensor measurements are available up to this cycle.</p> : <>
            <h4>Observed Sensor Trend</h4>
            <dl className="sensor-history-stats">
              {Object.entries({ Current: stats.current, Initial: stats.initial, Change: stats.change, Minimum: stats.min, Maximum: stats.max, Mean: stats.mean }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{label === 'Change' && value > 0 ? '+' : ''}{format(value)}</dd></div>)}
            </dl>
            <div role="img" aria-label={`${sensor} history for ${unit === null ? 'uploaded engine' : `engine ${unit}`} through cycle ${selectedCycle}`} className="sensor-history-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 30, right: 24, bottom: 28, left: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="cycle" type="number" domain={[points[0].cycle, selectedCycle]} label={{ value: 'Operating Cycle', position: 'bottom', offset: 8 }} />
                  <YAxis domain={['auto', 'auto']} tickFormatter={(value) => Number(value.toPrecision(5))} width={80} label={{ value: sensor, angle: -90, position: 'insideLeft', offset: -15 }} />
                  <Tooltip labelFormatter={(cycle) => `Operating Cycle ${cycle}`} formatter={(value) => [String(value), sensor]} />
                  <ReferenceLine x={selectedCycle} stroke="#ea580c" strokeDasharray="4 4" label={{ value: 'Current / Analyzed Cycle', position: 'insideTopRight', fill: '#9a3412', fontSize: 11 }} />
                  <Line type="linear" dataKey="value" name={sensor} stroke="#0284c7" strokeWidth={2} dot={points.length <= 50 ? { r: 3 } : false} activeDot={{ r: 5 }} isAnimationActive={false} />
                  {current && <ReferenceDot x={current.cycle} y={current.value} r={6} fill="#ea580c" stroke="#fff" strokeWidth={2} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="sensor-history-description">These descriptive measurements do not explain or establish the cause of the RUL prediction. RUL results are displayed separately.</p>
          </>}
        </>}
      </>}
    </section>
  );
}
