from fastapi import FastAPI, HTTPException
from backend.schemas.prediction import PredictionRequest
from backend.prediction.predict import run_prediction
from backend.services.risk_service import interpret_risk
from backend.config import PREDICTION_MODE
from backend.services.recommendation_service import (
    generate_llm_support,
    generate_rul_recommendations,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

FRONTEND_DIST = Path(__file__).resolve().parents[1] / "frontend" / "dist"

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
    if (FRONTEND_DIST / "index.html").is_file():
        return FileResponse(FRONTEND_DIST / "index.html")
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
            text=request.text,
            features=request.features,
        )

        risk = interpret_risk(prediction)

        support = generate_llm_support(
            prediction=prediction,
            risk_level=risk["risk_level"],
            factors=[]
        )
        if "rul" in prediction:
            recommendations = generate_rul_recommendations(
                prediction["rul"]
            )
        else:
            recommendations = support["recommendations"]

        return {
            "prediction": prediction,
            "risk_level": risk["risk_level"],
            "priority": risk["priority"],
            "risk_message": risk["message"],
            "factors": [],
            "explanation": support["explanation"],
            "recommendations": recommendations,
            "support_source": support["source"]
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )


# Register after API routes so /health, /config and /predict keep their handlers.
if FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
