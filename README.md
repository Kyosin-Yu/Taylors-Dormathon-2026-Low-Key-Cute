# Taylors-Dormathon-2026-Low-Key-Cute

Project developed for **Taylor's Dormathon 2026**.

## Track

**Track 1 — Predictive Model Track: Predict Early, Decide Better**

The project focuses on predictive maintenance and decision support by using
machine learning to forecast future engine condition and convert predictions
into actionable maintenance decisions.

---

## Project Overview

This project is an **AI-powered aircraft engine predictive maintenance
prototype** designed to help maintenance teams identify engine degradation
earlier and make more informed maintenance decisions.

The system analyzes aircraft turbofan engine operating conditions and sensor
data to estimate the engine's **Remaining Useful Life (RUL)**.

Instead of returning only a numerical prediction, the system converts the RUL
forecast into:

- Maintenance condition
- Risk level
- Priority level
- Human-readable explanation
- Preventive maintenance recommendations

The goal is to transform raw engine sensor data into actionable maintenance
intelligence before degradation becomes critical.

---

## Problem Statement

Aircraft engines generate large amounts of operational and sensor data, but
raw sensor measurements alone do not directly tell maintenance teams how much
useful operating life remains or how urgently maintenance should be planned.

Late identification of engine degradation may contribute to unscheduled
maintenance, aircraft downtime, operational disruption, and increased
maintenance costs.

Our solution addresses this problem by forecasting Remaining Useful Life and
converting the prediction into a practical maintenance decision.

---

## Dataset

The project uses the **NASA C-MAPSS Turbofan Engine Degradation Dataset**.

For the current proof of concept, we use the **FD001 subset**.

FD001 contains:

- 100 training engine trajectories
- 100 test engine trajectories
- 1 operating condition
- 1 degradation mode
- Multi-sensor engine measurements across operating cycles

The dataset is generated using NASA's physics-based C-MAPSS turbofan engine
simulation environment.

It is therefore **simulation data rather than live airline operational data**.

The dataset is used as a proof-of-concept benchmark for Remaining Useful Life
prediction because it provides run-to-failure engine degradation histories.

---

## Machine Learning Model

Three regression models were evaluated:

- Decision Tree Regressor
- Random Forest Regressor
- XGBoost Regressor

The **Random Forest Regressor** was selected as the final model because it
achieved the lowest validation RMSE.

### Validation Results

| Model | MAE | RMSE | R² |
|---|---:|---:|---:|
| Decision Tree | 12.58 | 19.33 | 0.785 |
| Random Forest | 10.81 | **15.95** | **0.854** |
| XGBoost | **10.79** | 16.05 | 0.852 |

### Official FD001 Test Results

- **MAE:** 12.44 cycles
- **RMSE:** 16.87 cycles
- **R²:** 0.823

The system treats RUL as an estimate for maintenance planning rather than an
exact prediction of the failure moment.

---

## Core System Flow

```text
Aircraft Engine Sensor Data
        ↓
Frontend Dashboard
        ↓
FastAPI Backend
        ↓
Feature Processing
        ↓
Random Forest RUL Model
        ↓
Remaining Useful Life Forecast
        ↓
Risk / Maintenance Condition
        ↓
Priority Assessment
        ↓
Explanation
        ↓
Preventive Maintenance Recommendation
        ↓
Result Display
