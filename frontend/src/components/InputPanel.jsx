function InputPanel({
  values,
  onChange,
  onPredict,
  loading,
}) {
  return (
    <div>
      <h3>Input Data</h3>

      {values.map((value, index) => (
        <div
          key={index}
          style={{ marginBottom: "12px" }}
        >
          <label>
            Feature {index + 1}
          </label>

          <br />

          <input
            type="number"
            value={value}
            onChange={(event) =>
              onChange(
                index,
                event.target.value
              )
            }
          />
        </div>
      ))}

      <button
        onClick={onPredict}
        disabled={loading}
      >
        {loading
          ? "Running..."
          : "Run Prediction"}
      </button>
    </div>
  );
}

export default InputPanel;
