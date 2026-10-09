function SystemStatus({
  backendOnline,
  predictionMode,
}) {
  return (
    <div
      style={{
        marginTop: "20px",
        marginBottom: "25px",
        padding: "12px",
        border: "1px solid #475569",
        borderRadius: "8px",
      }}
    >
      <strong>System Status</strong>

      <p style={{ margin: "8px 0 0" }}>
        Backend:{" "}
        {backendOnline ? "Online ✅" : "Offline ❌"}
      </p>

      <p style={{ margin: "5px 0 0" }}>
        Prediction Mode:{" "}
        {predictionMode || "Unknown"}
      </p>
    </div>
  );
}

export default SystemStatus;