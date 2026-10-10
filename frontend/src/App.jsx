import { useState, useEffect, useRef } from "react";
import { checkHealth, predict, chat, errorMessage, normalizePrediction } from "./api";
import "./App.css";

// ---------- sample data (replace with real data later) ----------

const KPIS = [
  { label: "Machines", value: 48, color: "#64748b" },
  { label: "Healthy", value: 41, color: "#16a34a" },
  { label: "Warning", value: 5, color: "#ea580c" },
  { label: "Critical", value: 2, color: "#dc2626" },
  { label: "Downtime avoided", value: "RM 135k", color: "#0284c7" },
];

const ANOMALIES = [
  { machine: "Pump-07", fault: "Bearing wear", severity: 92, rul: "3d", time: "2h ago", values: [86, 96, 51, 19] },
  { machine: "Motor-12", fault: "Overheating", severity: 64, rul: "9d", time: "18m ago", values: [50, 92, 50, 16] },
  { machine: "Fan-03", fault: "Vibration drift", severity: 38, rul: "21d", time: "1h ago", values: [64, 70, 50, 14] },
];

const FIELDS = ["Vibration", "Temperature", "Pressure", "Current"];

const NAV = [
  { name: "Dashboard" },
  { name: "Prediction" },
  { name: "Alerts" },
  { name: "Maintenance" },
  { name: "Insights" },
  { name: "AI Assistant" },
];

const SUGGESTIONS = [
  "Why was Pump-07 flagged?",
  "What should I do about bearing wear?",
  "Summarize today's anomalies",
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

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  const rows = lines.map((l) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
  return { headers: rows[0] || [], rows: rows.slice(1) };
}

const isNum = (c) => c !== "" && Number.isFinite(Number(c));

function App() {
  // ----- core state -----
  const [values, setValues] = useState([80, 75, 90, 70]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [page, setPage] = useState("Dashboard");

  // ----- chat state -----
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi, I'm your maintenance assistant. Ask me why a machine was flagged, what a prediction means, or what to do next." },
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

  // ----- image popup state -----
  const [imageModal, setImageModal] = useState(false);
  const [pendingImage, setPendingImage] = useState(null); // { file, url }
  const [attachedImage, setAttachedImage] = useState(null);
  const [imageError, setImageError] = useState("");
  const imageInputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading, page]);

  useEffect(() => {
    let alive = true;
    const ping = () =>
      checkHealth().then(() => alive && setOnline(true)).catch(() => alive && setOnline(false));
    ping();
    const id = setInterval(ping, 10000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // ----- CSV functions -----
  const applyRow = (data, index) => {
    setSelectedRow(index);
    setValues(data.numericIdx.map((c) => Number(data.rows[index][c])));
    setResult(null);
  };

  const handleCsvFile = async (file) => {
    setCsvError("");
    if (!file) return;
    if (file.type.startsWith("image/")) {
      openImageModal(file); // an image was chosen here: open the image popup instead
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setCsvError("Only .csv files are allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setCsvError("File is too large (max 2 MB).");
      return;
    }

    const { headers, rows } = parseCsv(await file.text());
    if (rows.length === 0) {
      setCsvError("The CSV has no data rows.");
      return;
    }

    const numericIdx = rows[0].map((c, i) => (isNum(c) ? i : -1)).filter((i) => i >= 0).slice(0, 4);
    if (numericIdx.length < 4) {
      setCsvError("The CSV needs at least 4 numeric columns (vibration, temperature, pressure, current).");
      return;
    }

    const data = { name: file.name, headers, rows, numericIdx };
    setCsv(data);
    applyRow(data, 0);
  };

  const removeCsv = () => {
    setCsv(null);
    setResult(null);
    setCsvError("");
  };

  // ----- image functions -----
  const pickImage = (file) => {
    setImageError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Please choose an image file (PNG, JPG or WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image is too large (max 5 MB).");
      return;
    }
    if (pendingImage) URL.revokeObjectURL(pendingImage.url);
    setPendingImage({ file, url: URL.createObjectURL(file) });
  };

  const openImageModal = (file) => {
    setImageError("");
    setPendingImage(null);
    setImageModal(true);
    if (file) pickImage(file);
  };

  const closeImageModal = () => {
    if (pendingImage) URL.revokeObjectURL(pendingImage.url);
    setPendingImage(null);
    setImageModal(false);
    setImageError("");
  };

  const confirmImage = () => {
    if (attachedImage) URL.revokeObjectURL(attachedImage.url);
    setAttachedImage(pendingImage);
    setPendingImage(null);
    setImageModal(false);
  };

  // ----- prediction -----
  const runPrediction = async (vals = values) => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await predict(vals);
      setResult(normalizePrediction(data));
    } catch (err) {
      console.error(err);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loadAnomaly = (row) => {
    setValues(row.values);
    runPrediction(row.values);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goTo = (name) => {
    setPage(name);
    setMenuOpen(false);
  };

  // ----- chat -----
  // Backend contract (agree with your teammate):
  // POST /chat  { message, history: [{role, content}], context }  ->  { reply: "..." }
  const sendMessage = async (text = chatInput) => {
    const q = text.trim();
    if (!q || chatLoading) return;
    const history = messages
      .slice(1)
      .filter((m) => !m.error)
      .map((m) => ({ role: m.role, content: m.text }))
      .slice(-10);
    setMessages((m) => [...m, { role: "user", text: q }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const data = await chat({
        message: q,
        history,
        context: { values, prediction: result?.prediction ?? null },
      });
      setMessages((m) => [...m, { role: "assistant", text: data.reply ?? "The assistant sent an empty reply." }]);
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
            3 alerts
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
                <div style={{ fontSize: 12, color: "#64748b" }}>Ask about predictions, faults and maintenance actions</div>
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
                        maxWidth: "75%", padding: "10px 14px", lineHeight: 1.5, whiteSpace: "pre-wrap",
                        borderRadius: 14, borderBottomRightRadius: user ? 4 : 14, borderBottomLeftRadius: user ? 14 : 4,
                        background: user ? "#0ea5e9" : m.error ? "#fef2f2" : "#fff",
                        color: user ? "#fff" : m.error ? "#b91c1c" : "#1e293b",
                        boxShadow: user ? "none" : "0 1px 2px rgba(15,23,42,.08)",
                      }}
                    >
                      {m.text}
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
        ) : page !== "Dashboard" ? (
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
                gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
                gap: 18,
                marginTop: 22,
                marginBottom: 18,
              }}
            >
              {/* LEFT: Sensor input (CSV upload) */}
              <div style={{ ...card, marginBottom: 0 }}>
                <h3 style={title}>Sensor input</h3>

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
                  <button style={button} onClick={() => csvInputRef.current.click()}>Choose CSV file</button>
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
                      The blue columns (first 4 numeric) are sent to the model.
                    </p>
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    style={{ ...button, opacity: loading || !csv ? 0.5 : 1 }}
                    onClick={() => runPrediction()}
                    disabled={loading || !csv}
                  >
                    {loading ? "Analyzing…" : "Run prediction"}
                  </button>
                  <button
                    onClick={() => openImageModal()}
                    style={{ ...button, background: "#fff", color: "#0369A1", border: "1px solid #BAE6FD" }}
                  >
                    Upload image
                  </button>
                </div>

                {attachedImage && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, fontSize: 13 }}>
                    <img src={attachedImage.url} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6 }} />
                    <span style={{ color: "#334155" }}>{attachedImage.file.name}</span>
                    <button
                      onClick={() => { URL.revokeObjectURL(attachedImage.url); setAttachedImage(null); }}
                      style={{ background: "transparent", border: "none", color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      Remove
                    </button>
                  </div>
                )}

                {error && <p style={{ color: "#dc2626", marginBottom: 0 }}>{error}</p>}
              </div>

              {/* RIGHT: Sensor overview */}
              <div style={{ ...card, marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <h3 style={{ ...title, marginBottom: 5 }}>Sensor overview</h3>
                    <p style={{ margin: 0, color: "#64748B", fontSize: 12 }}>Current input levels · Demo data</p>
                  </div>
                  <span style={{ background: "#E0F2FE", color: "#0369A1", padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                    4 sensors
                  </span>
                </div>

                {FIELDS.map((name, i) => {
                  const level = Math.min(100, Math.max(0, values[i]));
                  return (
                    <div key={name} style={{ marginBottom: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                        <span style={{ color: "#334155", fontWeight: 500 }}>{name}</span>
                        <span style={{ color: "#64748B", fontWeight: 600 }}>{values[i]}</span>
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

                <p style={{ fontSize: 11, color: "#94A3B8", marginBottom: 0 }}>
                  Bars show entered values on a 0–100 scale, not measured risk.
                </p>
              </div>
            </div>

            {/* Machines requiring attention (full width) */}
            <div style={card}>
              <h3 style={title}>Machines requiring attention</h3>

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
                    <div style={{ color: sevColor(machine.severity), fontWeight: 700, fontSize: 14 }}>{machine.severity}%</div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>Severity</div>
                  </div>
                </div>
              ))}

              <button style={{ ...button, width: "100%", marginTop: 18 }} onClick={() => setPage("Prediction")}>
                View predictions →
              </button>
            </div>

            {/* 3. Prediction result */}
            {result && (
              <div style={{ ...card, borderTop: `4px solid ${sevColor(result.prediction.score * 100)}` }}>
                <h3 style={title}>Prediction result</h3>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 22, fontWeight: 600, color: sevColor(result.prediction.score * 100) }}>{result.prediction.label}</span>
                  <span style={{ color: "#64748b" }}>Score {(result.prediction.score * 100).toFixed(1)}%</span>
                </div>
                <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4, margin: "10px 0 16px" }}>
                  <div style={{ width: `${result.prediction.score * 100}%`, height: 8, borderRadius: 4, background: sevColor(result.prediction.score * 100) }} />
                </div>

                <div style={{ fontWeight: 600, color: NAVY, marginBottom: 4 }}>Explanation</div>
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

            {/* 4. Recent anomalies */}
            <div style={card}>
              <h3 style={title}>Recent anomalies</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ color: "#64748b", fontSize: 12 }}>
                      <th style={{ padding: "8px 0" }}>Machine</th><th>Fault type</th><th>Severity</th><th>RUL</th><th>Time</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ANOMALIES.map((a) => (
                      <tr key={a.machine} style={{ borderTop: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "12px 0", fontWeight: 500 }}>
                          <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: sevColor(a.severity), marginRight: 8 }} />
                          {a.machine}
                        </td>
                        <td>{a.fault}</td>
                        <td>
                          <span style={{ background: sevColor(a.severity) + "1f", color: sevColor(a.severity), padding: "2px 10px", borderRadius: 12, fontWeight: 600 }}>{a.severity}</span>
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

      {/* ---------- image upload popup ---------- */}
      {imageModal && (
        <div
          onClick={closeImageModal}
          style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(15,23,42,.55)", display: "grid", placeItems: "center", padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Upload image"
            style={{ ...card, width: "100%", maxWidth: 440, marginBottom: 0 }}
          >
            <h3 style={title}>Upload image</h3>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => { pickImage(e.target.files[0]); e.target.value = ""; }}
            />

            {pendingImage ? (
              <img src={pendingImage.url} alt="Preview" style={{ width: "100%", maxHeight: 260, objectFit: "contain", borderRadius: 10, background: "#F8FAFC" }} />
            ) : (
              <div
                onClick={() => imageInputRef.current.click()}
                style={{ border: "2px dashed #CBD5E1", background: "#F8FAFC", borderRadius: 12, padding: 32, textAlign: "center", color: "#64748B", cursor: "pointer" }}
              >
                Click to choose an image
                <div style={{ fontSize: 12, marginTop: 4 }}>PNG, JPG or WEBP, up to 5 MB</div>
              </div>
            )}

            {imageError && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 0 }}>{imageError}</p>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button onClick={closeImageModal} style={{ ...button, background: "#fff", color: "#334155", border: "1px solid #CBD5E1" }}>
                Cancel
              </button>
              {pendingImage && (
                <button onClick={() => imageInputRef.current.click()} style={{ ...button, background: "#fff", color: "#0369A1", border: "1px solid #BAE6FD" }}>
                  Change
                </button>
              )}
              <button onClick={confirmImage} disabled={!pendingImage} style={{ ...button, opacity: pendingImage ? 1 : 0.5 }}>
                Use image
              </button>
            </div>
          </div>
        </div>
      )}

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