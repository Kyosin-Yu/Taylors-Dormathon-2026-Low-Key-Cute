#Note:
#Later this may become:
#High Failure Risk, Demand Spike, Market Downtrend, Capacity Shortage
#Depends on the domain

def interpret_risk(prediction: dict) -> dict:

    label = prediction["label"]
    score = prediction["score"]

    if label == "High":
        message = "The model detected a high-risk pattern."

    elif label == "Medium":
        message = "The model detected a moderate-risk pattern."

    else:
        message = "The model detected a low-risk pattern."

    return {
        "risk_level": label,
        "score": score,
        "message": message
    }