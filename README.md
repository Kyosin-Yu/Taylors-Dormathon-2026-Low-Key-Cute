# Taylors-Dormathon-2026-Low-Key-Cute
Project for Dormathon 2026
## Track
Track 1 — Predictive Model Track: Predict Early, Decide Better

## Project Overview
Brief explanation of what the system aims to do.

## Current Status
The official problem statement will be revealed on 10 October 2026.
The current project is a reusable predictive system skeleton that will be adapted after the problem reveal.

## Core System Flow

User Input
→ Frontend
→ FastAPI
→ Preprocessing
→ Predictive Model
→ Risk / Forecast Interpretation
→ LLM Explanation
→ Recommendation
→ Result Display

## Tech Stack
- Python 3.12
- FastAPI
- React
- Streamlit
- Hugging Face pretrained models
- LLM API
- Supabase (optional)
- GitHub

## Core Features
1. Data Input
2. Predictive Analysis
3. AI Explanation
4. Recommendation
5. Result Visualization

## Planned Model Options
- TimesFM / Chronos — time-series forecasting
- BERT / DeBERTa — text classification
- Other suitable ML models for structured/tabular data

## MVP Scope
- Working input
- Prediction
- Risk/result interpretation
- Explanation
- Recommendation
- Working Streamlit or React demo

## Backend Structure

backend/
├── main.py
├── prediction/
│   ├── model.py
│   ├── preprocess.py
│   └── predict.py
├── services/
│   ├── risk_service.py
│   ├── recommendation_service.py
│   ├── llm_service.py
│   └── supabase_service.py
└── schemas/
    └── prediction.py

## Current Limitations
- Final problem domain is not known yet
- Final dataset is not known yet
- Final model is not confirmed
- Final input/output format is not confirmed

## Development Priority

P0 — Must Have
- Prediction
- Explanation
- Recommendation
- Working Demo

P1 — Should Have
- React Dashboard
- Charts
- Risk Visualization

P2 — Nice to Have
- Supabase
- History
- SHAP
- Reports
- User Accounts

## Team Goal
Build a stable end-to-end prototype that can detect a future problem, explain the prediction, and recommend an action before the problem becomes costly.
