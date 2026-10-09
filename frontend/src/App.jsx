import { useEffect, useState } from "react";

import SystemStatus from "./components/SystemStatus";

import InputModeSelector from "./components/InputModeSelector";
import InputPanel from "./components/InputPanel";
import TextInputPanel from "./components/TextInputPanel";
import TimeSeriesInputPanel from "./components/TimeSeriesInputPanel";

import PredictionCard from "./components/PredictionCard";
import PredictionChart from "./components/PredictionChart";
import ExplanationCard from "./components/ExplanationCard";
import RecommendationCard from "./components/RecommendationCard";

import {
  getHealth,
  getConfig,
  runTabularPrediction,
  runTextPrediction,
  runTimeSeriesPrediction,
} from "./services/api";


function App() {
  // Input mode
  const [mode, setMode] = useState("tabular");

  // Tabular input
  const [values, setValues] = useState([
    80,
    75,
    90,
    70,
  ]);

  // Text input
  const [text, setText] = useState("");

  // Time series input
  const [series, setSeries] = useState(
    "10, 15, 20, 25, 30"
  );

  // Prediction result
  const [result, setResult] = useState(null);

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Backend status
  const [backendOnline, setBackendOnline] =
    useState(false);

  const [predictionMode, setPredictionMode] =
    useState("");

  // Check backend when React loads
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await getHealth();
        setBackendOnline(true);
        const config = await getConfig();
        setPredictionMode(
          config.prediction_mode || "Unknown"
        );
      } catch (error) {
        console.error(error);

        setBackendOnline(false);
        setPredictionMode("Unknown");
      }
    };
    checkBackend();
  }, []);

  // Handle numeric input
  const handleValueChange = (index, value) => {
    const updatedValues = [...values];

    updatedValues[index] = Number(value);

    setValues(updatedValues);
  };


  // Handle input mode change
  const handleModeChange = (newMode) => {
    setMode(newMode);

    setResult(null);
    setError("");
  };


  // Run prediction
  const handlePrediction = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      let data;

      // Numeric / Tabular
      if (mode === "tabular") {
        data = await runTabularPrediction(values);
      }

      // Text
      else if (mode === "text") {
        data = await runTextPrediction(text);
      }

      // Time Series
      else if (mode === "timeseries") {
        const parsedValues = series
          .split(",")
          .map((value) => Number(value.trim()))
          .filter((value) => !Number.isNaN(value));

        if (parsedValues.length === 0) {
          throw new Error(
            "Please enter valid time-series values."
          );
        }

        data = await runTimeSeriesPrediction(
          parsedValues
        );
      }

      setResult(data);

    } catch (error) {
      console.error(error);

      setError(
        "Prediction failed. Check the selected backend prediction mode."
      );

    } finally {
      setLoading(false);
    }
  };

  // UI
  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "40px auto",
        padding: "20px",
        fontFamily: "Arial",
      }}
    >
      <h1>Team Lowkey Cute</h1>

      <h2>
        Predictive Decision Support Prototype
      </h2>

      <p>
        Domain-agnostic prototype for testing
        different predictive input types.
      </p>

      <hr />

      {/* Backend status */}
      <SystemStatus
        backendOnline={backendOnline}
        predictionMode={predictionMode}
      />

      {/* Input mode selector */}
      <InputModeSelector
        mode={mode}
        onChange={handleModeChange}
      />

      {/* Tabular */}
      {mode === "tabular" && (
        <InputPanel
          values={values}
          onChange={handleValueChange}
          onPredict={handlePrediction}
          loading={loading}
        />
      )}

      {/* Text */}
      {mode === "text" && (
        <TextInputPanel
          text={text}
          onChange={setText}
          onPredict={handlePrediction}
          loading={loading}
        />
      )}

      {/* Time Series */}
      {mode === "timeseries" && (
        <TimeSeriesInputPanel
          series={series}
          onChange={setSeries}
          onPredict={handlePrediction}
          loading={loading}
        />
      )}

      {/* Error */}
      {error && (
        <p
          style={{
            marginTop: "20px",
            color: "#ef4444",
          }}
        >
          {error}
        </p>
      )}

      {/* Prediction result */}
      {result && (
        <>
          <hr
            style={{
              marginTop: "30px",
            }}
          />

          <PredictionCard
            prediction={result.prediction}
          />

          <PredictionChart
            score={result.prediction.score}
          />

          <ExplanationCard
            explanation={result.explanation}
          />

          <RecommendationCard
            recommendations={
              result.recommendations
            }
            supportSource={
              result.support_source
            }
          />
        </>
      )}
    </div>
  );
}

export default App;