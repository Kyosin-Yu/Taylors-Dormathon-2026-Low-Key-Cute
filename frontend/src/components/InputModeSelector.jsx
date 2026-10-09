function InputModeSelector({ mode, onChange }) {
  return (
    <div style={{ marginBottom: "25px" }}>
      <h3>Input Type</h3>

      <select
        value={mode}
        onChange={(event) => onChange(event.target.value)}
        style={{
          padding: "8px 12px",
          borderRadius: "6px",
        }}
      >
        <option value="tabular">Numeric / Tabular</option>
        <option value="text">Text</option>
        <option value="timeseries">Time Series</option>
      </select>
    </div>
  );
}

export default InputModeSelector;