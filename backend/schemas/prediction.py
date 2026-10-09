#Note:
# This file is generic as we dont really know the domain yet,
# will be configured once we get questions.

from pydantic import BaseModel
from typing import List


class PredictionRequest(BaseModel):
    values: List[float]


class PredictionResult(BaseModel):
    label: str
    score: float


class PredictionResponse(BaseModel):
    prediction: PredictionResult
    factors: List[str]
    explanation: str
    recommendations: List[str]