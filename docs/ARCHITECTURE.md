# System Architecture

## Current Prototype Flow

Streamlit UI
→ FastAPI
→ Prediction Schema
→ Preprocessing
→ Prediction Model
→ Risk Service
→ Recommendation Service
→ Response

## Planned Final Flow

React Dashboard
→ FastAPI
→ Preprocessing
→ Model Adapter
→ Hugging Face Pretrained Model
→ Prediction
→ Risk Interpretation
→ LLM Explanation
→ Recommendation
→ React Dashboard

## Prediction Layer

The prediction layer is designed to be replaceable depending on the final problem domain.

Possible adapters:

- Forecasting Adapter
  - Chronos
  - TimesFM

- Text Adapter
  - BERT
  - DeBERTa

- Tabular Adapter
  - Random Forest
  - XGBoost

The actual adapter will be selected after the official problem statement is revealed.