from typing import Dict, List, Optional

from pydantic import BaseModel


class PredictionRequest(BaseModel):
    values: Optional[List[float]] = None
    text: Optional[str] = None

    features: Optional[
        Dict[str, float]
    ] = None


class PredictionResult(BaseModel):
    label: str
    score: float


class PredictionResponse(BaseModel):
    prediction: PredictionResult
    factors: list = []
    explanation: str
    recommendations: list
    support_source: str