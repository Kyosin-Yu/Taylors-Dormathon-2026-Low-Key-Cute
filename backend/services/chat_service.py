import os
import re
from functools import lru_cache
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from google import genai
from google.genai import types

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")  # must run before reading any env vars

# Imported after load_dotenv so MODEL_RMSE / SAFETY_Z are read from .env.
from backend.services.decision_service import policy_summary  # noqa: E402

DATA_PATH = (
    ROOT / "dataset" / "cmapss" / "processed"
    / "train_FD001_processed.csv"
)

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
FALLBACK_MODELS = ["gemini-flash-latest"]
TIMEOUT_MS = 30000  # 30 seconds


@lru_cache(maxsize=1)
def load_dataset() -> pd.DataFrame | None:
    if not DATA_PATH.exists():
        return None
    return pd.read_csv(DATA_PATH)


def get_dataset_context(question: str) -> str:
    df = load_dataset()
    if df is None:
        return "The processed training dataset is unavailable."

    facts = [
        "Dataset summary: "
        f"{{'row_count': {len(df)}, "
        f"'engine_count': {int(df['unit_number'].nunique())}, "
        f"'columns': {list(df.columns)}}}"
    ]
    q = question.lower()

    if "rul" in q or "remaining useful life" in q:
        if "RUL_capped" in df.columns:
            facts.append(
                "RUL_capped statistics:\n"
                + df["RUL_capped"].describe().round(3).to_string()
            )

    if "sensor" in q:
        sensors = [c for c in df.columns if c.startswith("sensor_")]
        facts.append(
            "Sensor statistics:\n"
            + df[sensors].describe().round(3).to_string()
        )

    # Engine-specific questions: "engine 5", "unit 12"
    match = re.search(r"(?:engine|unit)\s*#?(\d+)", q)
    if match:
        unit = int(match.group(1))
        engine_df = df[df["unit_number"] == unit]
        if engine_df.empty:
            facts.append(f"Engine {unit} does not exist in the dataset.")
        else:
            facts.append(
                f"Engine {unit}: {len(engine_df)} cycles recorded."
            )
            if "RUL_capped" in engine_df.columns:
                last = engine_df.iloc[-1]
                facts.append(
                    f"Engine {unit} final-cycle RUL_capped: "
                    f"{last['RUL_capped']}"
                )

    return "\n\n".join(facts)


def format_prediction(prediction: dict | None) -> str:
    """Readable summary of the latest prediction + decision from the dashboard."""
    if not prediction:
        return "No prediction has been run in this session yet."

    lines = []

    def add(label, value):
        if value not in (None, "", [], {}):
            lines.append(f"{label}: {value}")

    rul = prediction.get("rul_cycles")
    add("Predicted RUL (cycles)", round(rul, 1) if isinstance(rul, (int, float)) else rul)
    add("Model", prediction.get("model"))
    add("Risk level", prediction.get("risk_level"))
    add("Priority (1-4)", prediction.get("priority"))
    add("Risk message", prediction.get("risk_message"))

    decision = prediction.get("decision")
    if isinstance(decision, dict):
        add("Decision tier", decision.get("tier"))
        add("Recommended action", decision.get("action"))
        add("When to act", decision.get("window"))
        add("Safety margin (cycles)", decision.get("safety_margin_cycles"))
        add("Operating guidance", decision.get("operating_guidance"))
        options = decision.get("options") or []
        if options:
            lines.append("Options compared:")
            for o in options:
                tag = " [RECOMMENDED]" if o.get("recommended") else ""
                lines.append(
                    f"- {o.get('name')}{tag} ({o.get('timing')}): "
                    f"benefit: {o.get('benefit')}; drawback: {o.get('drawback')}"
                )
        if decision.get("checklist"):
            lines.append("Action checklist: " + "; ".join(decision["checklist"]))
        if decision.get("triggers"):
            lines.append("Escalation triggers: " + "; ".join(decision["triggers"]))
        if decision.get("assumptions"):
            lines.append("Assumptions: " + " ".join(decision["assumptions"]))

    sensors = prediction.get("top_sensors")
    if sensors:
        lines.append("Sensors furthest toward failure levels:")
        for s in sensors:
            lines.append(
                f"- {s.get('sensor')}: {s.get('progress_pct')}% of the way from "
                f"healthy avg {s.get('healthy_avg')} to near-failure avg "
                f"{s.get('near_failure_avg')} (current {s.get('value')})"
            )

    features = prediction.get("features")
    if isinstance(features, dict) and features:
        lines.append("Input features: " + ", ".join(f"{k}={v}" for k, v in features.items()))

    return "\n".join(lines)[:6000]


def build_prompt(question: str, prediction: dict | None) -> str:
    return f"""
You are a maintenance decision-support assistant for an RUL (Remaining Useful
Life) prediction project using NASA C-MAPSS FD001.

Your job is to help the user DECIDE what to do, not only to explain numbers.
When the user asks about a prediction or what to do:
1. Lead with the recommendation: the action and when to do it.
2. Give the reasons: RUL, risk level, safety margin, and the sensors
   furthest toward failure levels (if provided).
3. Compare the options and their tradeoffs when relevant.
4. State what would change the decision (escalation triggers) and the
   key assumptions or uncertainty.

Rules:
- Use ONLY the context below. Never invent statistics, costs, sensor
  meanings, or predictions. If something is missing, say what is missing.
- RUL is in operating cycles, not days, and is not a failure probability.
- Follow the decision policy; do not contradict the dashboard's tier or action.
  The final call belongs to the maintenance engineer.
- Distinguish measured facts from interpretations. Keep answers concise and
  use short paragraphs or a short list.

Decision policy:
{policy_summary()}

Latest model prediction and decision from the user's session:
{format_prediction(prediction)}

Dataset context:
{get_dataset_context(question)}

User question:
{question}
"""


def answer_question(question: str, prediction: dict | None = None) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return (
            "The AI chat service is not configured. "
            "Please set GEMINI_API_KEY in your local .env file."
        )

    prompt = build_prompt(question, prediction)

    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=TIMEOUT_MS),
    )

    # Try the main model first, then fall back if it errors or times out.
    for model in [MODEL_NAME, *FALLBACK_MODELS]:
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
            )
            if response.text:
                return response.text
        except Exception as error:
            print(f"[chat] {model} failed: {error}")

    return (
        "The AI service is temporarily unavailable. "
        "Please try again in a moment."
    )