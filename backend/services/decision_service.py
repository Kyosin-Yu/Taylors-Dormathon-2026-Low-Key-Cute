"""Rule-based decision support built on top of the RUL prediction.

Turns "RUL = 54.6 cycles" into: what to do, by when, which options exist,
which sensors to check first, and when to escalate. No numbers are invented:
everything comes from the prediction, the risk thresholds, the model's
validation error and the training dataset.
"""
import math
import os
from functools import lru_cache
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv

from backend.services.risk_service import RUL_CRITICAL, RUL_MONITOR, RUL_WARNING

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

DATA_PATH = (
    ROOT / "dataset" / "cmapss" / "processed"
    / "train_FD001_processed.csv"
)

RUL_CAP = 125  # the dataset caps RUL at 125 cycles

# TODO: set MODEL_RMSE in .env to YOUR validation RMSE (in cycles).
MODEL_RMSE = float(os.getenv("MODEL_RMSE", "20"))
# 1.0 = about 84% chance of acting in time (if errors are roughly normal),
# 1.645 = about 95%. Higher = earlier, safer, more maintenance.
SAFETY_Z = float(os.getenv("SAFETY_Z", "1.0"))

SAFETY_MARGIN = SAFETY_Z * MODEL_RMSE

# tier -> (action, operating guidance, checklist, escalate_below)
TIERS = {
    "Immediate": (
        "Remove from service and inspect now",
        "Avoid further operation, especially at high load, until inspected.",
        ["Stop or minimise operation of this unit",
         "Inspect the flagged subsystems before any further use",
         "Confirm parts and crew availability today",
         "Return to service only after inspection is signed off"],
        None),
    "Urgent": (
        "Schedule maintenance at the next available slot",
        "Keep operating only at reduced load and only until the slot.",
        ["Book the maintenance slot now",
         "Order long-lead parts immediately",
         "Reduce load or duty cycle until maintenance",
         "Check readings every cycle"],
        math.ceil(SAFETY_MARGIN)),
    "Plan": (
        "Schedule maintenance within the planning window",
        "Normal operation is acceptable, with closer monitoring.",
        ["Book a maintenance slot inside the planning window",
         "Order parts and prepare the work package",
         "Increase monitoring frequency",
         "Review the sensor trends below"],
        RUL_CRITICAL),
    "Monitor": (
        "Continue operating with closer monitoring",
        "Normal operation. No maintenance needed yet.",
        ["Add this unit to the watch list",
         "Re-run the prediction on each new reading",
         "Plan maintenance at the next scheduled stop"],
        RUL_WARNING),
    "Routine": (
        "Continue normal operation",
        "No action needed. RUL is near the 125-cycle cap, so healthy units all read about the same.",
        ["Keep the normal inspection schedule",
         "Re-run the prediction periodically"],
        RUL_MONITOR),
}


def policy_summary() -> str:
    """Plain-text description of the decision policy (used by the chatbot)."""
    return (
        f"Risk levels by predicted RUL (cycles): Critical <= {RUL_CRITICAL}, "
        f"Warning <= {RUL_WARNING}, Monitor <= {RUL_MONITOR}, Healthy above that. "
        f"Safety margin = {SAFETY_Z:g} x model RMSE ({MODEL_RMSE:g} cycles) = "
        f"{round(SAFETY_MARGIN)} cycles. Planning window = predicted RUL minus the margin. "
        "Decision tiers: Immediate (no safe waiting time), Urgent (Critical), "
        "Plan (Warning), Monitor, Routine (Healthy)."
    )


@lru_cache(maxsize=1)
def _baselines():
    """Average sensor values when healthy vs. near failure."""
    if not DATA_PATH.exists():
        return None
    df = pd.read_csv(DATA_PATH)
    if "RUL_capped" not in df.columns:
        return None
    cols = [c for c in df.columns if c.startswith("sensor_")]
    healthy = df[df["RUL_capped"] >= RUL_CAP][cols]
    failing = df[df["RUL_capped"] <= 20][cols]
    if healthy.empty or failing.empty:
        return None
    return {
        "healthy": healthy.mean(),
        "failing": failing.mean(),
        "min": df[cols].min(),
        "max": df[cols].max(),
    }


def sensor_factors(features, top_n: int = 3) -> list[dict]:
    """Sensors whose current value is furthest toward the near-failure level."""
    base = _baselines()
    if not base or not isinstance(features, dict):
        return []

    rows, checked, skipped = [], 0, 0
    for name in base["healthy"].index:
        if name not in features:
            continue
        try:
            value = float(features[name])
        except (TypeError, ValueError):
            continue
        checked += 1
        lo, hi = float(base["min"][name]), float(base["max"][name])
        span = hi - lo
        # Input far outside the dataset range => the dataset is probably scaled.
        if span > 0 and not (lo - span <= value <= hi + span):
            skipped += 1
            continue
        healthy = float(base["healthy"][name])
        gap = float(base["failing"][name]) - healthy
        if abs(gap) < 1e-9:
            continue
        progress = max(0.0, min(1.5, (value - healthy) / gap))
        rows.append({
            "sensor": name,
            "progress_pct": round(progress * 100),
            "direction": "higher" if gap > 0 else "lower",
            "value": value,
            "healthy_avg": round(healthy, 3),
            "near_failure_avg": round(float(base["failing"][name]), 3),
        })

    if checked and skipped > checked / 2:
        return []  # units don't match the dataset, so don't guess
    rows = [r for r in rows if r["progress_pct"] >= 30]
    rows.sort(key=lambda r: r["progress_pct"], reverse=True)
    return rows[:top_n]


def build_decision(rul: float, risk_level: str, factors: list[dict]) -> dict:
    rul = max(0.0, float(rul))
    margin = SAFETY_MARGIN
    horizon = max(0, math.floor(rul - margin))  # latest "safe" point to act

    # The tier follows the risk badge, so the UI never contradicts itself.
    if risk_level == "Critical":
        # If RUL minus the error margin is <= 0, there is no safe time to wait.
        tier = "Immediate" if horizon <= 0 else "Urgent"
    else:
        tier = {"Warning": "Plan", "Monitor": "Monitor",
                "Healthy": "Routine"}.get(risk_level, "Monitor")

    action, guidance, checklist, escalate_below = TIERS[tier]
    checklist = list(checklist)

    if tier == "Immediate":
        window = "Now"
    elif tier in ("Urgent", "Plan"):
        window = f"Within {horizon} cycles"
    else:
        window = "At the next scheduled maintenance"

    if factors and tier != "Routine":
        names = ", ".join(f["sensor"] for f in factors)
        checklist.append(f"Check {names} first: they are furthest toward failure levels")

    if tier in ("Immediate", "Urgent", "Plan"):
        options = [
            {"name": "Maintain now", "timing": "Immediately",
             "benefit": "Lowest failure risk",
             "drawback": f"Gives up about {round(rul)} cycles of remaining life and causes unplanned downtime",
             "recommended": tier == "Immediate"},
            {"name": "Maintain in planning window", "timing": f"Within {horizon} cycles",
             "benefit": f"Time to order parts and schedule crew, keeping a {round(margin)}-cycle margin for prediction error",
             "drawback": "Needs closer monitoring until then",
             "recommended": tier in ("Urgent", "Plan")},
            {"name": "Run to predicted end of life", "timing": f"Around {round(rul)} cycles",
             "benefit": "Uses all remaining life",
             "drawback": f"Prediction error is about +/-{round(margin)} cycles, so failure may come first",
             "recommended": False},
        ]
    else:
        options = [
            {"name": "Continue and monitor", "timing": "Ongoing",
             "benefit": "No downtime, full use of remaining life",
             "drawback": "Requires re-checking on new readings",
             "recommended": True},
            {"name": "Maintain early", "timing": "Now",
             "benefit": "Removes any risk",
             "drawback": f"Wastes most of the ~{round(rul)} cycles remaining",
             "recommended": False},
        ]

    triggers = ["Re-run the prediction on each new reading. A single reading is noisy, so confirm the trend."]
    if escalate_below is not None:
        triggers.append(f"Escalate if predicted RUL falls below {escalate_below} cycles.")
    if tier != "Immediate":
        triggers.append("Escalate if RUL drops much faster than 1 cycle per operating cycle across several readings.")

    return {
        "tier": tier,
        "action": action,
        "window": window,
        "operating_guidance": guidance,
        "rul_cycles": round(rul, 1),
        "planning_window_cycles": horizon,
        "safety_margin_cycles": round(margin),
        "options": options,
        "checklist": checklist,
        "triggers": triggers,
        "assumptions": [
            f"Safety margin = {SAFETY_Z:g} x model RMSE ({MODEL_RMSE:g} cycles). The window is the predicted RUL minus this margin.",
            "RUL is in operating cycles, not days, and is not a failure probability.",
            "Model error is usually larger at high RUL and near the 125-cycle cap, so treat long horizons loosely.",
        ],
    }