function RecommendationCard({
  recommendations,
  supportSource,
}) {
  if (!recommendations) {
    return null;
  }

  return (
    <div style={{ marginTop: "20px" }}>
      <h3>Recommendations</h3>

      <ol>
        {recommendations.map(
          (recommendation, index) => (
            <li key={index}>
              {recommendation}
            </li>
          )
        )}
      </ol>

      <p>
        Support Source: {supportSource}
      </p>
    </div>
  );
}

export default RecommendationCard;