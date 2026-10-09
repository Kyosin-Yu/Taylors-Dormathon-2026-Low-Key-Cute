function ExplanationCard({ explanation }) {
  if (!explanation) {
    return null;
  }

  return (
    <div style={{ marginTop: "20px" }}>
      <h3>Explanation</h3>

      <p>{explanation}</p>
    </div>
  );
}

export default ExplanationCard;