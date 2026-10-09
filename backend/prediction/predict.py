from backend.config import PREDICTION_MODE
from backend.prediction.model import model
from backend.prediction.preprocess import (preprocess_values,preprocess_text)
from backend.prediction.adapters.forecasting_adapter import (predict as forecasting_predict)
from backend.prediction.adapters.text_adapter import (predict as text_predict)
from backend.prediction.adapters.tabular_adapter import (predict as tabular_predict)


def run_prediction(
    values: list[float] | None = None,
    text: str | None = None
) -> dict:

    if PREDICTION_MODE == "mock":

        processed_values = preprocess_values(values)

        return model.predict(processed_values)

    if PREDICTION_MODE == "text":

        processed_text = preprocess_text(text)

        return text_predict(processed_text)

    if PREDICTION_MODE == "forecasting":

        processed_values = preprocess_values(values)

        return forecasting_predict(processed_values)

    if PREDICTION_MODE == "tabular":

        processed_values = preprocess_values(values)

        return tabular_predict(processed_values)

    raise ValueError(
        f"Unsupported prediction mode: {PREDICTION_MODE}"
    )