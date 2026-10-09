from fastapi import FastAPI, HTTPException
from backend.schemas.prediction import PredictionRequest
from backend.prediction.predict import run_prediction
from backend.services.risk_service import interpret_risk
from backend.config import PREDICTION_MODE
from backend.services.recommendation_service import (generate_llm_support)
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Team Lowkey Cute Predictive API",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

        support = generate_llm_support(
            prediction=prediction,
            risk_level=risk["risk_level"],
            factors=[]
        )

        return {
            "prediction": prediction,
            "factors": [],
            "explanation": support["explanation"],
            "recommendations": support["recommendations"],
            "support_source": support["source"]
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )