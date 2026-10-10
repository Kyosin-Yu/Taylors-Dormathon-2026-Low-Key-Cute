import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[1]
ARTIFACT_DIR = BASE_DIR / "artifacts"

MODEL_PATH = ARTIFACT_DIR / "rul_model.joblib"
METADATA_PATH = ARTIFACT_DIR / "rul_model_metadata.json"


_model = None
_metadata = None


def _load_model():
    global _model
    global _metadata

    if _model is None:
        _model = joblib.load(MODEL_PATH)

    if _metadata is None:
        with open(
            METADATA_PATH,
            "r",
            encoding="utf-8",
        ) as file:
            _metadata = json.load(file)

    return _model, _metadata


def predict(features: dict):
    """
    Predict Remaining Useful Life (RUL)
    from one current machine state.
    """

    model, metadata = _load_model()

    required_features = metadata["features"]

    missing_features = [
        feature
        for feature in required_features
        if feature not in features
    ]

    if missing_features:
        raise ValueError(
            "Missing forecasting features: "
            + ", ".join(missing_features)
        )

    input_row = {
        feature: features[feature]
        for feature in required_features
    }

    input_df = pd.DataFrame(
        [input_row]
    )

    prediction = model.predict(
        input_df
    )[0]

    prediction = float(
        np.clip(
            prediction,
            0,
            metadata["rul_cap"],
        )
    )

    return {
        "rul": prediction,
        "model": metadata["model_name"],
    }