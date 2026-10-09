function TimeSeriesInputPanel({
  series,
  onChange,
  onPredict,
  loading,
}) {
  return (
    <div>
      <h3>Historical Data</h3>

      <p>
        Enter values separated by commas.
      </p>

      <textarea
        value={series}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Example: 12, 15, 18, 20, 25"
        rows={4}
        style={{
          width: "100%",
          maxWidth: "500px",
          padding: "10px",
          borderRadius: "6px",
          marginBottom: "15px",
        }}
      />

      <br />

      <button
        onClick={onPredict}
        disabled={loading || !series.trim()}
      >
        {loading ? "Running..." : "Run Prediction"}
      </button>
    </div>
  );
}

export default TimeSeriesInputPanel;