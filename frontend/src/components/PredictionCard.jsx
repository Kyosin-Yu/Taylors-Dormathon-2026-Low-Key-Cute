function PredictionCard({ prediction }) {
  if (!prediction) {
    return null;
  }

  return (
    <div style={{ marginTop: "25px" }}>
      <h2>Prediction Result</h2>

      <h3>{prediction.label}</h3>

      <p>
        Score:{" "}
        {(prediction.score * 100).toFixed(1)}%
      </p>
    </div>
  );
}

export default PredictionCard;