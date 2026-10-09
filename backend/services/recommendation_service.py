#Note:
#This is our fallback
#Just in case if  LLM API is unavailable, we can use these fallback recommendations
#So demo never completely depends on the LLM API

def generate_fallback_recommendations(risk_level: str) -> list[str]:

    if risk_level == "High":
        return [
            "Review the strongest contributing factors immediately.",
            "Take preventive action before the predicted issue occurs.",
            "Monitor the situation closely."
        ]

    if risk_level == "Medium":
        return [
            "Monitor the current trend.",
            "Review factors that may increase the risk.",
            "Prepare preventive action if conditions worsen."
        ]

    return [
        "Continue monitoring the situation.",
        "Maintain current preventive measures.",
        "Review the prediction again when new data becomes available."
    ]