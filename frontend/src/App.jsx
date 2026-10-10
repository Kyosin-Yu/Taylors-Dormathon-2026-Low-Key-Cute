import { useEffect, useState } from "react";

import {
  getHealth,
  getConfig,
  runForecastingPrediction,
} from "./services/api";


function App() {
  const [backendOnline, setBackendOnline] =
    useState(false);

  const [predictionMode, setPredictionMode] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [result, setResult] =
    useState(null);


  // -----------------------------------------
  // C-MAPSS sample machine state
  // -----------------------------------------

  const [features, setFeatures] = useState({
    time_cycles: 126,

    operational_setting_1: 0.001,
    operational_setting_2: -0.0002,

    sensor_2: 642.8,
    sensor_3: 1593.2,
    sensor_4: 1412.5,

    sensor_7: 553.1,
    sensor_8: 2388.1,
    sensor_9: 9080.5,

    sensor_11: 47.6,
    sensor_12: 521.2,
    sensor_13: 2388.1,

    sensor_14: 8150.3,
    sensor_15: 8.45,

    sensor_17: 394,

    sensor_20: 38.7,
    sensor_21: 23.2,
  });


  // -----------------------------------------
  // Check backend
  // -----------------------------------------

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


  // -----------------------------------------
  // Feature input change
  // -----------------------------------------

  const handleFeatureChange = (
    featureName,
    value
  ) => {
    setFeatures((previous) => ({
      ...previous,

      [featureName]:
        Number(value),
    }));
  };


  // -----------------------------------------
  // Run prediction
  // -----------------------------------------

  const handlePrediction = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data =
        await runForecastingPrediction(
          features
        );

      setResult(data);

    } catch (error) {
      console.error(error);

      setError(
        "Prediction failed. Please check the backend."
      );

    } finally {
      setLoading(false);
    }
  };


  // -----------------------------------------
  // Formatting
  // -----------------------------------------

  const formatFeatureName = (name) => {
    return name
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };


  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "40px auto",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Header */}

      <h1>
        Industrial Predictive Maintenance
      </h1>

      <p>
        AI-powered Remaining Useful Life
        forecasting and maintenance decision
        support.
      </p>


      {/* Backend status */}

      <div
        style={{
          padding: "14px",
          marginTop: "20px",
          marginBottom: "25px",
          border: "1px solid #ddd",
          borderRadius: "8px",
        }}
      >
        <strong>
          Backend:
        </strong>{" "}

        {backendOnline
          ? "Online"
          : "Offline"}

        <br />

        <strong>
          Prediction Mode:
        </strong>{" "}

        {predictionMode}
      </div>


      {/* Sensor input */}

      <h2>
        Machine Sensor Data
      </h2>

      <p>
        Enter the current operating
        condition of the machine.
      </p>


      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
        }}
      >
        {Object.entries(features).map(
          ([name, value]) => (

            <div
              key={name}
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <label
                style={{
                  marginBottom: "6px",
                  fontWeight: "bold",
                }}
              >
                {formatFeatureName(name)}
              </label>

              <input
                type="number"
                step="any"
                value={value}
                onChange={(event) =>
                  handleFeatureChange(
                    name,
                    event.target.value
                  )
                }
                style={{
                  padding: "10px",
                  border:
                    "1px solid #ccc",
                  borderRadius: "6px",
                }}
              />
            </div>
          )
        )}
      </div>


      {/* Predict button */}

      <button
        onClick={handlePrediction}
        disabled={
          loading ||
          !backendOnline
        }
        style={{
          marginTop: "25px",
          padding: "12px 22px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        {loading
          ? "Analyzing..."
          : "Predict Machine Health"}
      </button>


      {/* Error */}

      {error && (
        <p
          style={{
            color: "red",
            marginTop: "20px",
          }}
        >
          {error}
        </p>
      )}


      {/* Result */}

      {result && (
        <div
          style={{
            marginTop: "35px",
            borderTop:
              "2px solid #ddd",
            paddingTop: "25px",
          }}
        >
          <h2>
            Predictive Maintenance Report
          </h2>


          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "15px",
              marginTop: "20px",
            }}
          >
            {/* RUL */}

            <div
              style={{
                padding: "20px",
                border:
                  "1px solid #ddd",
                borderRadius: "8px",
              }}
            >
              <h3>
                Estimated RUL
              </h3>

              <div
                style={{
                  fontSize: "32px",
                  fontWeight: "bold",
                }}
              >
                {result.prediction.rul.toFixed(
                  1
                )}
              </div>

              <p>
                cycles remaining
              </p>
            </div>


            {/* Risk */}

            <div
              style={{
                padding: "20px",
                border:
                  "1px solid #ddd",
                borderRadius: "8px",
              }}
            >
              <h3>
                Risk Level
              </h3>

              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "bold",
                }}
              >
                {result.risk_level}
              </div>

              <p>
                Priority:
                {" "}
                {result.priority}
              </p>
            </div>


            {/* Model */}

            <div
              style={{
                padding: "20px",
                border:
                  "1px solid #ddd",
                borderRadius: "8px",
              }}
            >
              <h3>
                Prediction Model
              </h3>

              <div
                style={{
                  fontSize: "22px",
                  fontWeight: "bold",
                }}
              >
                {result.prediction.model}
              </div>
            </div>
          </div>


          {/* Risk message */}

          <div
            style={{
              marginTop: "20px",
              padding: "20px",
              border:
                "1px solid #ddd",
              borderRadius: "8px",
            }}
          >
            <h3>
              Machine Health Assessment
            </h3>

            <p>
              {result.risk_message}
            </p>

            <p>
              {result.explanation}
            </p>
          </div>


          {/* Recommendations */}

          <div
            style={{
              marginTop: "20px",
              padding: "20px",
              border:
                "1px solid #ddd",
              borderRadius: "8px",
            }}
          >
            <h3>
              Recommended Actions
            </h3>

            <ul>
              {result.recommendations.map(
                (
                  recommendation,
                  index
                ) => (
                  <li
                    key={index}
                    style={{
                      marginBottom:
                        "8px",
                    }}
                  >
                    {recommendation}
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}


export default App;