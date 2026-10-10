import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';
import { sensorSeries } from '../services/timeSeries';

const SENSORS = ['sensor_2', 'sensor_3', 'sensor_4', 'sensor_7', 'sensor_8', 'sensor_9', 'sensor_11', 'sensor_12', 'sensor_13', 'sensor_14', 'sensor_15', 'sensor_17', 'sensor_20', 'sensor_21'];

export default function SensorTimeSeries({ csv, selectedRow, onSelectRow, disabled }) {
  const [sensor, setSensor] = useState('sensor_2');
  const { points, unit, duplicates } = sensorSeries(csv, selectedRow, sensor);
  const selectedCycle = points.find((point) => point.rowIndex === selectedRow)?.cycle;
  return (
    <section style={{ background: '#fff', border: '1px solid #E5EAF2', borderRadius: 16, padding: 22, marginBottom: 18 }}>
      <h3 style={{ marginTop: 0, color: '#0B1220' }}>Sensor history over operating cycles</h3>
      <p style={{ color: '#64748b' }}>Measured CSV values{unit !== null ? ` for engine ${unit}` : ''}. This chart shows sensor history, not future predictions.</p>
      {!csv ? <p>Upload a CSV with multiple cycles to explore a trend. <a href="/cmapss-timeseries-sample.csv" download>Download time series sample</a></p> : <>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 18 }}>
          <label>Sensor{' '}<select value={sensor} onChange={(event) => setSensor(event.target.value)}>{SENSORS.map((name) => <option key={name}>{name}</option>)}</select></label>
          <label>Analyze row{' '}<select value={selectedRow} disabled={disabled} onChange={(event) => onSelectRow(csv, Number(event.target.value))}>
            {csv.rows.map((row, index) => <option key={index} value={index}>Row {index + 1}{csv.headers.includes('unit_number') ? ` · Engine ${row[csv.headers.indexOf('unit_number')]}` : ''} · Cycle {row[csv.headers.indexOf('time_cycles')]}</option>)}
          </select></label>
        </div>
        {unit === null && <p>Without a unit_number column, all rows are treated as one engine. Upload one engine per file or include unit_number.</p>}
        {duplicates ? <p role="alert">Repeated cycles were found for this engine. Provide one measurement per cycle to draw an unambiguous trend.</p> : <>
          {points.length < 2 && <p>This engine has only one measurement. Upload more cycles to see a trend.</p>}
          <div role="img" aria-label={`${sensor} over operating cycles${unit !== null ? ` for engine ${unit}` : ''}`} style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 12, right: 24, bottom: 25, left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="cycle" type="number" domain={['dataMin', 'dataMax']} label={{ value: 'Operating cycle', position: 'bottom', offset: 8 }} />
                <YAxis domain={['auto', 'auto']} tickFormatter={(value) => Number(value.toPrecision(5))} width={85} />
                <Tooltip labelFormatter={(cycle) => `Cycle ${cycle}`} />
                <ReferenceLine x={selectedCycle} stroke="#ea580c" strokeDasharray="4 4" label="Selected" />
                <Line type="linear" dataKey="value" name={sensor} stroke="#0284c7" strokeWidth={2} dot={points.length <= 50} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>}
      </>}
    </section>
  );
}
