from fastapi import FastAPI, HTTPException
from backend.schemas.prediction import PredictionRequest
from backend.prediction.predict import run_prediction
from backend.services.risk_service import interpret_risk
from backend.services.recommendation_service import (generate_fallback_recommendations)
from backend.config import PREDICTION_MODE


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


@app.get("/config")
def config():
    return {
        "prediction_mode": PREDICTION_MODE
    }


@app.post("/predict")
def predict(request: PredictionRequest):
    try:
        prediction = run_prediction(
            values=request.values,
            text=request.text
        )
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
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )