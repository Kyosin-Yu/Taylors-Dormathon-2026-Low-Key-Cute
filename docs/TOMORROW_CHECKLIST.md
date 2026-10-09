# Dormathon 2026 — Tomorrow Checklist

## Team: Lowkey Cute
Track: Predictive Model Track — Predict Early, Decide Better

Goal:
Build a working predictive decision-support system that can:
1. Accept input/data
2. Predict a future risk/outcome
3. Explain the prediction
4. Recommend what the user should do next

---

# 1. After Problem Reveal

Do NOT start coding immediately.

First answer these questions:

## Problem
- What problem are we predicting?
- What expensive issue are we trying to prevent?
- Who is the target user?
- What decision should the system help them make?

## Prediction Target
Write one clear sentence:

> Given ________, predict ________.

Example:

> Given machine sensor readings, predict whether equipment failure is likely.

---

# 2. Identify Input Type

Choose ONE primary input type.

## A. Numeric / Tabular

Examples:
- Sensor readings
- Customer information
- Financial indicators
- Environmental measurements
- Business metrics

Use:

```python
PREDICTION_MODE = "tabular"