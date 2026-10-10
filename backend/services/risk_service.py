#Note:
#Later this may become:
#High Failure Risk, Demand Spike, Market Downtrend, Capacity Shortage
#Depends on the domain

def interpret_risk(prediction: dict) -> dict:
    """
    Interpret model prediction into an
    actionable maintenance risk level.
    """

    # -----------------------------------------
    # Forecasting / RUL mode
    # -----------------------------------------

    if "rul" in prediction:
        rul = float(prediction["rul"])

        if rul <= 30:
            return {
                "risk_level": "Critical",
                "priority": 4,
                "message": (
                    "The machine is approaching the end "
                    "of its estimated useful life."
                ),
            }

        elif rul <= 60:
            return {
                "risk_level": "Warning",
                "priority": 3,
                "message": (
                    "The machine shows significant "
                    "degradation and should be scheduled "
                    "for maintenance soon."
                ),
            }

        elif rul <= 100:
            return {
                "risk_level": "Monitor",
                "priority": 2,
                "message": (
                    "The machine remains operational but "
                    "should be monitored for further "
                    "degradation."
                ),
            }

        else:
            return {
                "risk_level": "Healthy",
                "priority": 1,
                "message": (
                    "The machine currently has a relatively "
                    "high estimated remaining useful life."
                ),
            }

    # -----------------------------------------
    # Legacy prediction mode
    # -----------------------------------------

    if "label" in prediction:
        label = prediction["label"]

        if label == "High":
            return {
                "risk_level": "High",
                "priority": 3,
                "message": "High predicted risk detected.",
            }

        elif label == "Medium":
            return {
                "risk_level": "Medium",
                "priority": 2,
                "message": "Moderate predicted risk detected.",
            }

        return {
            "risk_level": "Low",
            "priority": 1,
            "message": "Low predicted risk detected.",
        }

    # -----------------------------------------
    # Invalid prediction
    # -----------------------------------------

    raise ValueError(
        "Prediction format is not supported."
    )