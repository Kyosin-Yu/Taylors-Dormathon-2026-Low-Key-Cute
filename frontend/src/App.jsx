import { useState, useEffect, useRef } from "react";
import { checkHealth, predict, errorMessage, normalizePrediction, chat } from "./api";
import "./App.css";
import { parseCsv } from "./services/csv";
import ReactMarkdown from "react-markdown";
import SensorTimeSeries from "./components/SensorTimeSeries";
import { engineHistory, numericValue } from "./services/timeSeries";

// Required CSV columns match the forecasting model metadata.
const FIELDS = [
  "time_cycles", "operational_setting_1", "operational_setting_2",
  "sensor_2", "sensor_3", "sensor_4", "sensor_7", "sensor_8", "sensor_9",
  "sensor_11", "sensor_12", "sensor_13", "sensor_14", "sensor_15",
  "sensor_17", "sensor_20", "sensor_21",
];
const riskColor = (risk) => ({ Critical: "#dc2626", Warning: "#ea580c", Monitor: "#ca8a04", Healthy: "#16a34a" }[risk] || "#64748b");

const SUGGESTIONS = [
  "Explain the latest prediction",
  "What maintenance is recommended?",
  "What does RUL mean?",
  "Summarize the RUL distribution",
];

// ---------- styles ----------

const NAVY = "#0B1220";

const card = {
  background: "#FFFFFF",
  border: "1px solid #E5EAF2",
  borderRadius: 16,
  padding: 22,
  marginBottom: 18,
  boxShadow: "0 4px 16px rgba(15,23,42,0.04)",
};

const title = {
  margin: "0 0 18px",
  fontSize: 17,
  fontWeight: 650,
  color: NAVY,
  letterSpacing: "-0.3px",
};

const input = {
  padding: "11px 13px",
  width: 140,
  fontSize: 14,
  fontFamily: "inherit",
  border: "1px solid #D8E1ED",
  borderRadius: 10,
  background: "#F8FAFC",
  color: "#172033",
};

const button = {
  padding: "10px 18px",
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "inherit",
  border: "none",
  borderRadius: 10,
  background: "linear-gradient(135deg, #0284C7, #2563EB)",
  color: "#FFFFFF",
  cursor: "pointer",
};

// ---------- CSV helpers ----------

function App() {
  // ----- core state -----
  const [values, setValues] = useState([]);
  const [reports, setReports] = useState([]);
  const [predictionMode, setPredictionMode] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chatOpen, setChatOpen] = useState(false);

  // ----- chat state -----
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I can explain engine health, remaining life, and the recommended maintenance actions." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  

  // ----- backend connection status -----
  const [online, setOnline] = useState(null); // null = checking, true = online, false = offline

  // ----- CSV upload state -----
  const [csv, setCsv] = useState(null); // { name, headers, rows, numericIdx }
  const [selectedRow, setSelectedRow] = useState(0);
  const [csvError, setCsvError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const csvInputRef = useRef(null);

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading, chatOpen]);

  useEffect(() => {
    let alive = true;
    const ping = () =>
      checkHealth().then((config) => { if (alive) { setOnline(true); setPredictionMode(config.prediction_mode); } }).catch(() => alive && setOnline(false));
    ping();
    const id = setInterval(ping, 10000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // ----- CSV functions -----
  const applyRow = (data, index) => {
    if (loading) return;
    setSelectedRow(index);
    setValues(data.numericIdx.map((c) => numericValue(data.rows[index][c]) ?? ""));
    setResult(null);
    setError("");
  };

  const handleCsvFile = async (file) => {
    setCsvError("");
    if (!file || loading) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setCsvError("Only .csv files are allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setCsvError("File is too large (max 2 MB).");
      return;
    }

    let parsed;
    try { parsed = parseCsv(await file.text()); }
    catch (err) { setCsvError(err.message); return; }
    const { headers, rows } = parsed;
    if (new Set(headers).size !== headers.length) { setCsvError("CSV column names must be unique."); return; }
    if (rows.length === 0) {
      setCsvError("The CSV has no data rows.");
      return;
    }

    const numericIdx = FIELDS.map((name) => headers.indexOf(name));
    const data = { name: file.name, headers, rows, numericIdx };
    setCsv(data);
    // Open the first identified engine at its latest cycle so history is visible.
    const history = engineHistory(data, 0);
    const firstUnitRow = history.unitColumn < 0 ? 0 : rows.findIndex((row) => String(row[history.unitColumn] ?? "").trim() !== "");
    const firstEngine = engineHistory(data, Math.max(0, firstUnitRow));
    applyRow(data, firstEngine.engineRows.at(-1)?.rowIndex ?? 0);
  };

  const removeCsv = () => {
    if (loading) return;
    setCsv(null);
    setValues([]);
    setSelectedRow(0);
    setError("");
    setResult(null);
    setCsvError("");
  };

  // ----- prediction -----
  const runPrediction = async (vals = values) => {
    if (loading || !csv) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      if (vals.length !== FIELDS.length || vals.some((v) => v === "" || !Number.isFinite(Number(v)))) throw new Error("Upload a CSV containing a valid number for every required feature.");
      const features = Object.fromEntries(FIELDS.map((name, i) => [name, Number(vals[i])]));
      const data = normalizePrediction(await predict(features));
      setResult(data);
      setReports((previous) => [{ ...data, machine: `Analysis ${previous.length + 1}`, fault: data.risk_message, severity: data.priority * 25, rul: `${data.prediction.rul.toFixed(1)} cycles`, time: new Date().toLocaleTimeString(), values: [...vals], csv, selectedRow }, ...previous]);
    } catch (err) {
      console.error(err);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadAnomaly = (row) => {
    if (loading) return;
    setValues(row.values);
    setCsv(row.csv);
    setSelectedRow(row.selectedRow);
    setResult(row);
    setError("");
    setCsvError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ----- chat -----
  // Send questions and the latest prediction to the backend chatbot.
  const sendMessage = async (text = chatInput) => {
    const q = text.trim();
    if (!q || chatLoading) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setChatInput("");
    setChatLoading(true);
    try {
      // Send the latest prediction so the bot can explain it.
      const prediction = result
        ? {
            rul_cycles: result.prediction.rul,
            model: result.prediction.model,
            risk_level: result.risk_level,
            priority: result.priority,
            risk_message: result.risk_message,
            explanation: result.explanation,
            recommendations: result.recommendations,
            features: Object.fromEntries(FIELDS.map((name, i) => [name, Number(values[i])])),
          }
        : null;
      const answer = await chat(q, prediction);
      setMessages((m) => [...m, { role: "assistant", text: answer }]);
    } catch (err) {
      console.error(err);
      setMessages((m) => [...m, { role: "assistant", error: true, text: errorMessage(err) }]);
    } finally {
      setChatLoading(false);
    }
  };

  const predictionReady = Boolean(csv && online && predictionMode === "forecasting" && values.length === FIELDS.length && values.every((value) => value !== "" && Number.isFinite(Number(value))));
  const unitColumn = csv?.headers.indexOf("unit_number") ?? -1;
  const engine = unitColumn >= 0 ? csv.rows[selectedRow]?.[unitColumn] : null;
  const cycle = csv ? values[0] : null;
  const useSample = async () => {
    try {
      const response = await fetch("/cmapss-timeseries-sample.csv");
      if (!response.ok) throw new Error("Sample unavailable. Please upload your CSV.");
      await handleCsvFile(new File([await response.blob()], "cmapss-timeseries-sample.csv", { type: "text/csv" }));
    } catch (err) { setCsvError(err.message); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'IBM Plex Sans', Arial, sans-serif", fontSize: 14 }}>
      <header className="app-header">
        <div><strong>PredictiveOps</strong><span className="team-name">Team Low Key Cute</span></div>
        <span className="connection-status"><i style={{ background: online === null ? "#eab308" : online ? "#22c55e" : "#ef4444" }} />{online === null ? "Connecting…" : online ? "Ready" : "Connecting to service…"}</span>
      </header>
      <main className="dashboard-main">
        <section className="dashboard-intro">
          <span className="eyebrow">AIRCRAFT ENGINE MAINTENANCE</span>
          <h1>Predict early. Plan maintenance.</h1>
          <p>Check an engine’s remaining life and when to plan maintenance.</p>
          <span className="prototype-note">Prototype · NASA simulated engine data</span>
        </section>

        <section style={card}>
          <div className="section-heading"><div><h2 style={title}>1. Add engine data</h2><p>Upload a CSV, or try the demo dataset.</p></div><button style={button} disabled={loading} onClick={useSample}>Try demo data</button></div>
          <div onDragOver={(event) => { event.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(event) => { event.preventDefault(); setDragOver(false); handleCsvFile(event.dataTransfer.files[0]); }} className={`csv-dropzone${dragOver ? " is-dragging" : ""}`}>
            <input ref={csvInputRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => { handleCsvFile(event.target.files[0]); event.target.value = ""; }} />
            <span>{csv ? <><strong>{csv.name}</strong> · {csv.rows.length} readings</> : "Drop your CSV here · up to 2 MB"}</span>
            <button className="secondary-button" disabled={loading} onClick={() => csvInputRef.current.click()}>{csv ? "Change file" : "Choose CSV"}</button>
            {csv && <button className="text-button" disabled={loading} onClick={removeCsv}>Remove</button>}
          </div>
          {csvError && <p role="alert" className="error-message">{csvError}</p>}
          <details className="quiet-details"><summary>CSV format & sample file</summary>
            <p>Use the C-MAPSS column names. Column order can vary; extra columns are allowed.</p>
            <p>For history: time_cycles and sensor columns. Add unit_number when the file contains several engines.</p>
            <p>For remaining-life prediction: all 17 model inputs must be numeric in the selected reading.</p>
            <code className="feature-list">{FIELDS.join(", ")}</code>
            <p><a href="/cmapss-timeseries-sample.csv" download>Download demo CSV</a></p>
          </details>
        </section>

        <SensorTimeSeries csv={csv} selectedRow={selectedRow} onSelectRow={applyRow} disabled={loading} />

        {csv && <section style={card}>
          <div className="section-heading"><div><h2 style={title}>3. Check remaining life</h2><p>{engine ? `Engine ${engine} · ` : ""}Cycle {cycle === "" ? "unavailable" : cycle}</p></div>
            <button style={{ ...button, opacity: !predictionReady || loading ? 0.5 : 1 }} disabled={!predictionReady || loading} onClick={() => runPrediction()}>{loading ? "Analyzing…" : "Analyze engine"}</button>
          </div>
          {!predictionReady && <p role="status">{!online ? "Waiting for the service to connect." : predictionMode !== "forecasting" ? "The service is not set to engine forecasting." : "This reading has missing inputs. Choose a complete reading to predict remaining life."}</p>}
          {error && <p role="alert" className="error-message">{error}</p>}
          {result && <div className="engine-result" style={{ borderColor: riskColor(result.risk_level) }}>
            <div className="result-headline"><div><span className="result-label">Estimated remaining life</span><div className="rul-value">{result.prediction.rul.toFixed(1)} <span>operating cycles</span></div></div><span className="condition-badge" style={{ color: riskColor(result.risk_level), background: `${riskColor(result.risk_level)}15` }}>{result.risk_level} · Priority {result.priority}/4</span></div>
            <p className="muted">An operating cycle is one step in the engine’s recorded history. Priority 4 is most urgent.</p>
            <h3>Recommended next steps</h3>
            <ol className="maintenance-actions">{result.recommendations.map((item, index) => <li key={index}>{item}</li>)}</ol>
            <button className="secondary-button" onClick={() => setChatOpen(true)}>Ask AI to explain this result</button>
            <details className="quiet-details"><summary>About this estimate</summary><p>{result.risk_message}</p><p>{result.explanation}</p><p>Model: {result.prediction.model} · Explanation source: {result.support_source}</p><p>Remaining useful life (RUL) is an estimate, not a guaranteed failure date. Maintenance categories use prototype rules.</p></details>
          </div>}
        </section>}

        {csv && <details style={card} className="quiet-details"><summary>View uploaded readings</summary><div className="readings-table"><table><thead><tr><th>Input</th><th>Selected value</th></tr></thead><tbody>{FIELDS.map((name, index) => <tr key={name}><td>{name}</td><td>{values[index] === "" ? "Unavailable" : values[index]}</td></tr>)}</tbody></table></div></details>}
        {reports.length > 0 && <details style={card} className="quiet-details"><summary>Recent checks ({reports.length})</summary><p className="muted">Checks in this browser session. Reloading clears this list.</p><div className="readings-table"><table><thead><tr><th>Check</th><th>Condition</th><th>Life remaining</th><th></th></tr></thead><tbody>{reports.map((report) => <tr key={report.machine}><td>{report.machine}</td><td style={{ color: riskColor(report.risk_level) }}>{report.risk_level}</td><td>{report.rul}</td><td><button className="text-button" disabled={loading} onClick={() => loadAnomaly(report)}>View</button></td></tr>)}</tbody></table></div></details>}
        <footer className="dashboard-footer">Proof of concept using NASA C-MAPSS FD001 simulation data. Supports maintenance planning; not certified for aviation use.</footer>
      </main>

      {chatOpen && <div className="chat-overlay" onKeyDown={(event) => { if (event.key === "Escape") setChatOpen(false); }}>
        <button className="chat-backdrop" aria-label="Close assistant overlay" onClick={() => setChatOpen(false)} />
        <section role="dialog" aria-modal="true" aria-label="AI assistant" className="chat-dialog">
          <div className="chat-heading"><div><h2>AI assistant</h2><p>Ask about engine health or your latest result.</p></div><button className="secondary-button" autoFocus onClick={() => setChatOpen(false)}>Close</button></div>
          <div className="chat-messages">{messages.map((message, index) => <div key={index} className={`chat-message ${message.role === "user" ? "from-user" : "from-assistant"}${message.error ? " has-error" : ""}`}>{message.role === "user" || message.error ? message.text : <div className="chat-md"><ReactMarkdown>{message.text}</ReactMarkdown></div>}</div>)}
            {messages.length === 1 && <div className="chat-suggestions">{SUGGESTIONS.map((question) => <button key={question} className="secondary-button" disabled={chatLoading} onClick={() => sendMessage(question)}>{question}</button>)}</div>}
            {chatLoading && <p role="status">Thinking…</p>}<div ref={chatEndRef} />
          </div>
          <form className="chat-form" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}><input aria-label="Your question" value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask a question…" style={{ ...input, width: "auto", flex: 1, minWidth: 0 }} /><button style={button} disabled={chatLoading || !chatInput.trim()}>Send</button></form>
        </section>
      </div>}
      {!chatOpen && <button className="assistant-launcher" aria-label="Open AI assistant" onClick={() => setChatOpen(true)}>Ask AI</button>}
    </div>
  );
}

export default App;
