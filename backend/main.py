from fastapi import FastAPI

from backend.schemas.prediction import PredictionRequest
from backend.prediction.predict import run_prediction
from backend.services.risk_service import interpret_risk
from backend.services.recommendation_service import (
    generate_fallback_recommendations
)

app = FastAPI(
    title="Team Lowkey Cute Predictive API",
    version="0.1.0"
)


@app.get("/")
def root():
    return {
        "message": "Team Lowkey Cute Predictive API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.post("/predict")
def predict(request: PredictionRequest):

    prediction = run_prediction(request.values)

    risk = interpret_risk(prediction)

    recommendations = generate_fallback_recommendations(
        risk["risk_level"]
    )

    return {
        "prediction": prediction,
        "factors": [],
        "explanation": risk["message"],
        "recommendations": recommendations
    }