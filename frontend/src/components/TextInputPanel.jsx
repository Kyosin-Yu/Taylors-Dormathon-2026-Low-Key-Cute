function TextInputPanel({
  text,
  onChange,
  onPredict,
  loading,
}) {
  return (
    <div>
      <h3>Text Input</h3>

      <textarea
        value={text}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Enter text for prediction..."
        rows={6}
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
        disabled={loading || !text.trim()}
      >
        {loading ? "Running..." : "Run Prediction"}
      </button>
    </div>
  );
}

export default TextInputPanel;