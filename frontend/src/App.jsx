import { useState } from "react";
import axios from "axios";

function App() {
  const [values, setValues] = useState([80, 75, 90, 70]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (index, value) => {
    const updatedValues = [...values];
    updatedValues[index] = Number(value);
    setValues(updatedValues);
  };

  const runPrediction = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/predict",
        {
          values: values,
        }
      );

      setResult(response.data);
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the prediction backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "40px auto",
        padding: "20px",
        fontFamily: "Arial",
      }}
    >
      <h1>Team Lowkey Cute</h1>
      <h2>Predictive Decision Support Prototype</h2>

      <p>
        Domain-agnostic frontend used to test the prediction pipeline.
      </p>

      <hr />

      <h3>Input Data</h3>

      {values.map((value, index) => (
        <div key={index} style={{ marginBottom: "10px" }}>
          <label>Feature {index + 1}</label>
          <br />

          <input
            type="number"
            value={value}
            onChange={(event) =>
              handleChange(index, event.target.value)
            }
          />
        </div>
      ))}

      <button
        onClick={runPrediction}
        disabled={loading}
      >
        {loading ? "Running..." : "Run Prediction"}
      </button>

      {error && (
        <p style={{ marginTop: "20px" }}>
          {error}
        </p>
      )}

      {result && (
        <div style={{ marginTop: "30px" }}>
          <hr />

          <h2>Prediction Result</h2>

          <h3>{result.prediction.label}</h3>

          <p>
            Score:{" "}
            {(result.prediction.score * 100).toFixed(1)}%
          </p>

          <h3>Explanation</h3>

          <p>{result.explanation}</p>

          <h3>Recommendations</h3>

          <ol>
            {result.recommendations.map(
              (recommendation, index) => (
                <li key={index}>
                  {recommendation}
                </li>
              )
            )}
          </ol>

          <p>
            Support Source: {result.support_source}
          </p>
        </div>
      )}
    </div>
  );
}

export default App;