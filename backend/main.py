# main.py  -  stand-in backend so the frontend can be tested end to end.
# Your teammate replaces the logic inside predict() and chat() with the real model.
#
# Run:  pip install fastapi uvicorn
#       uvicorn main:app --reload --port 8000

from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="PredictiveOps API")

# Allows the Vite dev server on any local port (5173, 5174, ...).
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    values: List[float]  # [vibration, temperature, pressure, current]


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    context: Optional[Dict[str, Any]] = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
def predict(req: PredictRequest):
    if len(req.values) != 4:
        raise HTTPException(status_code=422, detail="Send exactly 4 values: vibration, temperature, pressure, current.")

    # ---- REPLACE THIS BLOCK WITH THE REAL MODEL ----
    score = max(0.0, min(1.0, sum(req.values) / len(req.values) / 100))
    if score >= 0.75:
        label, recs = "Critical: likely bearing wear", ["Inspect the bearing within 24 hours", "Reduce load to 70% until inspected", "Reserve a spare bearing"]
    elif score >= 0.5:
        label, recs = "Warning: abnormal behaviour", ["Schedule an inspection this week", "Increase monitoring frequency"]
    else:
        label, recs = "Normal", ["No action needed"]
    explanation = f"Average sensor level is {score * 100:.0f}% of the expected maximum (demo rule, not the real model)."
    # -------------------------------------------------

    return {
        "prediction": {"label": label, "score": round(score, 3)},
        "explanation": explanation,
        "recommendations": recs,
        "support_source": "demo rule",
    }


@app.post("/chat")
def chat(req: ChatRequest):
    # ---- REPLACE THIS BLOCK WITH THE REAL ASSISTANT ----
    pred = (req.context or {}).get("prediction")
    if pred:
        reply = f"The latest prediction is '{pred.get('label')}' with a score of {pred.get('score')}. You asked: {req.message}"
    else:
        reply = f"You asked: {req.message}. Run a prediction first so I can use the sensor data."
    # ----------------------------------------------------
    return {"reply": reply}