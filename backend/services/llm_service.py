import os

from dotenv import load_dotenv

load_dotenv()


def generate_explanation(prediction, factors=None):
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    try:
        from google import genai
    except ImportError:
        raise RuntimeError(
            "google-genai package is not installed."
        )

    client = genai.Client(api_key=api_key)

    factors_text = (
        ", ".join(map(str, factors))
        if factors
        else "No contributing factors available."
    )

    prompt = f"""
You are an AI decision-support assistant.

Prediction:
- Label: {prediction["label"]}
- Score: {prediction["score"]}

Contributing factors:
{factors_text}

Explain the prediction clearly in 2-3 sentences.

Do not invent facts.
Do not change the prediction.
Focus only on helping the user understand the result.
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    return response.text