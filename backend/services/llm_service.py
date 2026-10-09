import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
client = None


def get_client():
    global client

    if not API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured.")

    if client is None:
        client = genai.Client(
            api_key=API_KEY
        )

    return client


def generate_explanation(
    prediction: dict,
    factors: list[str] | None = None
) -> str:

    factors = factors or []

    prompt = f"""
You are a decision-support assistant.

A predictive machine learning model produced the following result:

Prediction:
- Label: {prediction["label"]}
- Score: {prediction["score"]}

Known contributing factors:
{factors}

Your task:
1. Explain the result in simple language.
2. Do not change the prediction.
3. Do not generate a new probability.
4. Keep the explanation concise.
"""

    gemini = get_client()

    response = gemini.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    return response.text