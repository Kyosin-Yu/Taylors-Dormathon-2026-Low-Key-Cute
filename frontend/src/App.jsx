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

const NAV = [
  { name: "Dashboard" },
  { name: "Prediction" },
  { name: "Alerts" },
  { name: "Maintenance" },
  { name: "Insights" },
  { name: "AI Assistant" },
];

const SUGGESTIONS = [
  "Explain the latest prediction",
  "What maintenance is recommended?",
  "What does RUL mean?",
  "Summarize the RUL distribution",
];

const sevColor = (s) => (s >= 75 ? "#dc2626" : s >= 50 ? "#ea580c" : "#ca8a04");

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
  const KPIS = [
    { label: "Analyses this session", value: reports.length, color: "#64748b" },
    ...["Healthy", "Monitor", "Warning", "Critical"].map((risk) => ({ label: risk, value: reports.filter((r) => r.risk_level === risk).length, color: riskColor(risk) })),
  ];
  const ANOMALIES = reports.filter((r) => r.risk_level !== "Healthy");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [page, setPage] = useState("Dashboard");

  // ----- chat state -----
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! Ask me about the C-MAPSS dataset, or run a prediction and I can explain the result and recommended maintenance." },
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
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading, page]);

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
    setPage("Prediction");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goTo = (name) => {
    setPage(name);
    setMenuOpen(false);
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

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'IBM Plex Sans', Arial, sans-serif", fontSize: 14 }}>
      {/* ---------- top bar ---------- */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", alignItems: "center", gap: 14, padding: "0 20px", height: 56, background: NAVY, color: "#fff" }}>
        <button
          aria-label="Open navigation"
          onClick={() => setMenuOpen(true)}
          style={{ background: "transparent", border: "1px solid #334155", borderRadius: 8, color: "#fff", fontSize: 20, width: 38, height: 38, cursor: "pointer" }}
        >
          ☰
        </button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.1 }}>PredictiveOps</div>
          <div style={{ fontSize: 11, color: "#93c5fd" }}>Team Lowkey Cute</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span title="Backend connection" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#cbd5e1" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: online === null ? "#eab308" : online ? "#22c55e" : "#ef4444" }} />
            {online === null ? "Checking…" : online ? "Backend online" : "Backend offline"}
          </span>
          <div style={{ background: "#dc2626", borderRadius: 14, padding: "3px 12px", fontSize: 12, fontWeight: 500 }}>
            {ANOMALIES.length} session alerts
          </div>
        </div>
      </header>

      {/* ---------- slide-in navigation ---------- */}
      {menuOpen && <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 30 }} />}
      <aside
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: 250, zIndex: 40, padding: 16,
          background: NAVY, color: "#fff",
          transform: menuOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform .25s ease",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Menu</span>
          <button aria-label="Close navigation" onClick={() => setMenuOpen(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>
        {NAV.map((n) => (
          <button
            key={n.name}
            onClick={() => goTo(n.name)}
            style={{
              display: "block", width: "100%", padding: "11px 12px", marginBottom: 4,
              border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontFamily: "inherit", textAlign: "left",
              background: page === n.name ? "#1e3a8a" : "transparent",
              color: page === n.name ? "#fff" : "#cbd5e1",
              borderLeft: page === n.name ? "3px solid #38bdf8" : "3px solid transparent",
            }}
          >
            {n.name}
          </button>
        ))}
      </aside>

      {/* ---------- page content ---------- */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
        {page === "AI Assistant" ? (
          <div style={{ ...card, display: "flex", flexDirection: "column", height: "calc(100vh - 100px)", minHeight: 420, padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #e2e8f0" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: NAVY }}>AI assistant</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Ask about the dataset or your latest prediction</div>
              </div>
              <button onClick={() => goTo("Dashboard")} style={{ background: "transparent", border: "1px solid #cbd5e1", borderRadius: 8, padding: "5px 12px", fontSize: 13, fontFamily: "inherit", color: "#334155", cursor: "pointer" }}>
                Back to dashboard
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 18, background: "#f8fafc" }}>
              {messages.map((m, i) => {
                const user = m.role === "user";
                return (
                  <div key={i} style={{ display: "flex", justifyContent: user ? "flex-end" : "flex-start", marginBottom: 10 }}>
                    <div
                      style={{
                        maxWidth: "75%", padding: "10px 14px", lineHeight: 1.5, whiteSpace: user || m.error ? "pre-wrap" : "normal",
                        borderRadius: 14, borderBottomRightRadius: user ? 4 : 14, borderBottomLeftRadius: user ? 14 : 4,
                        background: user ? "#0ea5e9" : m.error ? "#fef2f2" : "#fff",
                        color: user ? "#fff" : m.error ? "#b91c1c" : "#1e293b",
                        boxShadow: user ? "none" : "0 1px 2px rgba(15,23,42,.08)",
                      }}
                    >
                      {user || m.error ? m.text : <div className="chat-md"><ReactMarkdown>{m.text}</ReactMarkdown></div>}
                    </div>
                  </div>
                );
              })}

              {messages.length === 1 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                  {SUGGESTIONS.map((q) => (
                    <button key={q} onClick={() => sendMessage(q)} style={{ background: "#fff", border: "1px solid #bae6fd", color: "#0369a1", borderRadius: 16, padding: "6px 14px", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {chatLoading && (
                <div style={{ display: "flex", marginBottom: 10 }}>
                  <div style={{ padding: "10px 14px", borderRadius: 14, borderBottomLeftRadius: 4, background: "#fff", color: "#64748b", boxShadow: "0 1px 2px rgba(15,23,42,.08)" }}>Thinking…</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid #e2e8f0", background: "#fff" }}
            >
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your question…"
                style={{ ...input, width: "auto", flex: 1, borderRadius: 20, padding: "9px 16px" }}
              />
              <button type="submit" disabled={chatLoading || !chatInput.trim()} style={{ ...button, borderRadius: 20, padding: "8px 22px", opacity: chatLoading || !chatInput.trim() ? 0.5 : 1 }}>
                Send
              </button>
            </form>
          </div>
        ) : !["Dashboard", "Prediction"].includes(page) ? (
          <div style={{ ...card, textAlign: "center", padding: 48 }}>
            <h2 style={{ margin: 0, color: NAVY }}>{page}</h2>
            <p style={{ color: "#64748b" }}>This page is coming soon.</p>
            <button style={button} onClick={() => goTo("Dashboard")}>Back to dashboard</button>
          </div>
        ) : (
          <>
            {/* 1. KPI cards */}
            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              {KPIS.map((k) => (
                <div key={k.label} style={{ ...card, flex: 1, minWidth: 150, marginBottom: 0, borderLeft: `4px solid ${k.color}` }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: k.color, lineHeight: 1.1 }}>{k.value}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{k.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sensor input + Sensor overview, side by side */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
                gap: 18,
                marginTop: 22,
                marginBottom: 18,
              }}
            >
              {/* LEFT: Sensor input (CSV upload) */}
              <div style={{ ...card, marginBottom: 0 }}>
                <h3 style={title}>Upload sensor CSV</h3>
                <p>C-MAPSS remaining useful life · {predictionMode || "Checking mode…"}</p>
                {online && predictionMode !== "forecasting" && <p role="alert">Set the backend prediction mode to forecasting to use this dashboard.</p>}
                <p>Upload historical rows with time_cycles and sensor_* columns. Include unit_number for multiple engines. RUL prediction requires all 17 model features on the selected row. <a href="/cmapss-sample.csv" download>Download single-row sample CSV</a> · <a href="/cmapss-timeseries-sample.csv" download>Download time series sample</a></p>

                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); handleCsvFile(e.dataTransfer.files[0]); }}
                  style={{
                    border: `2px dashed ${dragOver ? "#0284C7" : "#CBD5E1"}`,
                    background: dragOver ? "#F0F9FF" : "#F8FAFC",
                    borderRadius: 12, padding: 20, textAlign: "center", marginBottom: 14,
                  }}
                >
                  <div style={{ color: "#334155", fontWeight: 500 }}>Drop a CSV file here</div>
                  <div style={{ fontSize: 12, color: "#64748B", margin: "4px 0 12px" }}>Only .csv files, up to 2 MB</div>
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: "none" }}
                    onChange={(e) => { handleCsvFile(e.target.files[0]); e.target.value = ""; }}
                  />
                  <button style={button} disabled={loading} onClick={() => csvInputRef.current.click()}>Choose CSV file</button>
                </div>

                {csvError && <p style={{ color: "#dc2626", fontSize: 13, margin: "0 0 14px" }}>{csvError}</p>}

                {csv && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: "#0F172A" }}>
                        {csv.name} <span style={{ color: "#64748B", fontWeight: 400 }}>· {csv.rows.length} rows</span>
                      </span>
                      <button onClick={removeCsv} style={{ background: "transparent", border: "none", color: "#dc2626", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
                        Remove
                      </button>
                    </div>

                    <div style={{ overflowX: "auto", border: "1px solid #E5EAF2", borderRadius: 10 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                          <tr>
                            <th style={{ padding: 8, textAlign: "left", background: "#F8FAFC", color: "#64748B" }}>#</th>
                            {csv.headers.map((h, c) => {
                              const used = csv.numericIdx.includes(c);
                              return (
                                <th key={c} style={{ padding: 8, textAlign: "left", whiteSpace: "nowrap", background: used ? "#E0F2FE" : "#F8FAFC", color: used ? "#0369A1" : "#64748B" }}>
                                  {h}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {csv.rows.slice(0, 5).map((row, r) => (
                            <tr
                              key={r}
                              onClick={() => applyRow(csv, r)}
                              style={{ cursor: "pointer", borderTop: "1px solid #EEF2F7", background: r === selectedRow ? "#F0F9FF" : "#fff" }}
                            >
                              <td style={{ padding: 8, color: "#94A3B8" }}>{r + 1}</td>
                              {csv.headers.map((_, c) => (
                                <td key={c} style={{ padding: 8, whiteSpace: "nowrap" }}>{row[c]}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p style={{ fontSize: 11, color: "#94A3B8", margin: "6px 0 0" }}>
                      Showing the first {Math.min(5, csv.rows.length)} of {csv.rows.length} rows. Click a row to use it.
                      The blue columns are mapped by feature name and sent to the C-MAPSS model.
                    </p>
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    style={{ ...button, opacity: loading || !csv || !online || predictionMode !== "forecasting" ? 0.5 : 1 }}
                    onClick={() => runPrediction()}
                    disabled={loading || !csv || !online || predictionMode !== "forecasting" || values.length !== FIELDS.length || values.some((value) => value === "" || !Number.isFinite(Number(value)))}
                  >
                    {loading ? "Analyzing…" : "Run prediction"}
                  </button>
                </div>
                {!csv && <p style={{ color: "#64748B", fontSize: 13 }}>Upload a valid CSV to enable prediction.</p>}
                {csv && values.some((value) => value === "") && <p role="status">Sensor history is available, but this row is missing valid model features. Select a row with all 17 required numeric features to run RUL prediction.</p>}

                {error && <p style={{ color: "#dc2626", marginBottom: 0 }}>{error}</p>}
              </div>

              {/* RIGHT: Sensor overview */}
              <div style={{ ...card, marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <h3 style={{ ...title, marginBottom: 5 }}>Sensor overview</h3>
                    <p style={{ margin: 0, color: "#64748B", fontSize: 12 }}>{csv ? `Selected CSV row ${selectedRow + 1}` : "No CSV loaded"}</p>
                  </div>
                  <span style={{ background: "#E0F2FE", color: "#0369A1", padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                    17 features
                  </span>
                </div>

                {!csv && <p style={{ color: "#64748B" }}>Upload a CSV to see the selected row’s sensor values here.</p>}
                {csv && FIELDS.map((name, i) => {
                  const level = Math.min(100, Math.max(0, values[i]));
                  return (
                    <div key={name} style={{ marginBottom: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                        <span style={{ color: "#334155", fontWeight: 500 }}>{name}</span>
                        <span style={{ color: "#64748B", fontWeight: 600 }}>{values[i] === "" ? "Unavailable" : values[i]}</span>
                      </div>
                      <div style={{ height: 9, background: "#E2E8F0", borderRadius: 10, overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${level}%`,
                            height: "100%",
                            borderRadius: 10,
                            background: level >= 80 ? "linear-gradient(90deg, #F59E0B, #EF4444)" : "linear-gradient(90deg, #38BDF8, #2563EB)",
                            transition: "width .3s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                {csv && <p style={{ fontSize: 11, color: "#94A3B8", marginBottom: 0 }}>
                  Bars are clipped to a 0–100 display scale; raw feature values above are used for prediction.
                </p>}
              </div>
            </div>

            <SensorTimeSeries csv={csv} selectedRow={selectedRow} onSelectRow={applyRow} disabled={loading} />

            {/* Machines requiring attention (full width) */}
            <div style={card}>
              <h3 style={title}>Analyses requiring attention</h3>{ANOMALIES.length === 0 && <p>No flagged analyses in this session.</p>}

              {ANOMALIES.map((machine) => (
                <div
                  key={machine.machine}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderBottom: "1px solid #EEF2F7" }}
                >
                  <div
                    style={{
                      width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                      background: `${sevColor(machine.severity)}15`, color: sevColor(machine.severity),
                      display: "grid", placeItems: "center", fontSize: 19,
                    }}
                  >
                    ⚙
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>{machine.machine}</div>
                    <div style={{ fontSize: 12, color: "#64748B" }}>{machine.fault}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: sevColor(machine.severity), fontWeight: 700, fontSize: 14 }}>{machine.priority}</div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>Priority</div>
                  </div>
                </div>
              ))}

              <button style={{ ...button, width: "100%", marginTop: 18 }} onClick={() => setPage("Prediction")}>
                View predictions →
              </button>
            </div>

            {/* 3. Prediction result */}
            {result && (
              <div style={{ ...card, borderTop: `4px solid ${riskColor(result.risk_level)}` }}>
                <h3 style={title}>Prediction result</h3>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 22, fontWeight: 600, color: riskColor(result.risk_level) }}>{result.risk_level}</span>
                  <span style={{ color: "#64748b" }}>RUL {result.prediction.rul.toFixed(1)} cycles · Priority {result.priority}</span>
                </div>
                <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4, margin: "10px 0 16px" }}>
                  <div style={{ width: `${Math.min(100, result.prediction.rul / 125 * 100)}%`, height: 8, borderRadius: 4, background: riskColor(result.risk_level) }} />
                </div>

                <p>{result.risk_message}</p><p>Model: {result.prediction.model}</p><div style={{ fontWeight: 600, color: NAVY, marginBottom: 4 }}>Explanation</div>
                <p style={{ marginTop: 0, color: "#334155" }}>{result.explanation}</p>

                <div style={{ fontWeight: 600, color: NAVY, marginBottom: 4 }}>Recommendations</div>
                <ol style={{ marginTop: 0, color: "#334155", paddingLeft: 20 }}>
                  {result.recommendations.map((r, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{r}</li>
                  ))}
                </ol>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>Support source: {result.support_source}</div>
              </div>
            )}

            {/* 4. Session analysis history */}
            <div style={card}>
              <h3 style={title}>Session analysis history</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ color: "#64748b", fontSize: 12 }}>
                      <th style={{ padding: "8px 0" }}>Machine</th><th>Fault type</th><th>Risk</th><th>RUL</th><th>Time</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((a) => (
                      <tr key={a.machine} style={{ borderTop: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "12px 0", fontWeight: 500 }}>
                          <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: sevColor(a.severity), marginRight: 8 }} />
                          {a.machine}
                        </td>
                        <td>{a.fault}</td>
                        <td>
                          <span style={{ background: sevColor(a.severity) + "1f", color: sevColor(a.severity), padding: "2px 10px", borderRadius: 12, fontWeight: 600 }}>{a.risk_level}</span>
                        </td>
                        <td>{a.rul}</td>
                        <td style={{ color: "#94a3b8" }}>{a.time}</td>
                        <td style={{ textAlign: "right" }}>
                          <button style={{ ...button, padding: "4px 14px" }} onClick={() => loadAnomaly(a)}>Load</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* floating AI assistant button: always visible except on the chat page */}
      {page !== "AI Assistant" && (
        <button
          aria-label="Open AI assistant"
          title="Ask the AI assistant"
          onClick={() => goTo("AI Assistant")}
          style={{
            position: "fixed", right: 24, bottom: 24, zIndex: 25, width: 56, height: 56, borderRadius: "50%",
            border: "none", cursor: "pointer", display: "grid", placeItems: "center",
            background: "linear-gradient(135deg,#0ea5e9,#1e3a8a)", boxShadow: "0 6px 16px rgba(14,165,233,.45)",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5h16v11H9l-5 4z" />
            <path d="M9 10h6" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default App;
