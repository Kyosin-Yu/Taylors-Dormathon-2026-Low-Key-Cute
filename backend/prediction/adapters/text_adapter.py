from transformers import pipeline

MODEL_NAME = "distilbert-base-uncased-finetuned-sst-2-english"

classifier = None
def load_model():
    """
    Lazily load the Hugging Face model.

    Lazy loading prevents the model from loading
    until it is actually needed.
    """

    global classifier

    if classifier is None:
        classifier = pipeline(
            "sentiment-analysis",
            model=MODEL_NAME
        )

    return classifier


def predict(text: str) -> dict:
    """
    Proof-of-concept text prediction.

    This model performs sentiment classification.

    NEGATIVE sentiment is temporarily interpreted
    as higher risk for testing purposes only.

    This is NOT the final hackathon prediction logic.
    """

    model = load_model()

    result = model(text)[0]

    raw_label = result["label"]
    confidence = float(result["score"])

    # Convert sentiment result into a generic
    # risk score for our prototype pipeline.
    if raw_label == "NEGATIVE":
        risk_score = confidence
    else:
        risk_score = 1 - confidence

    if risk_score >= 0.70:
        label = "High"

    elif risk_score >= 0.40:
        label = "Medium"

    else:
        label = "Low"

    return {
        "label": label,
        "score": round(risk_score, 4)
    }