from backend.prediction.model import model
from backend.prediction.preprocess import preprocess


def run_prediction(values: list[float]) -> dict:

    processed_values = preprocess(values)

    result = model.predict(processed_values)

    return result