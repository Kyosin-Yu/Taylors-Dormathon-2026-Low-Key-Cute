Team Lowkey Cute — Project Handoff & Setup Guide

Purpose

This document explains the current project context, architecture, setup steps, what has already been completed, and how a teammate should start the project from a fresh GitHub pull/clone.

Project: Taylor's Dormathon 2026 — Team Lowkey Cute  
Track: Predictive Model Track — Predict Early, Decide Better

Current goal before the official problem reveal:
- Keep the project domain-agnostic.
- Prepare a reusable predictive decision-support skeleton.
- After the real problem statement is revealed, replace only the relevant model/input/domain-specific parts instead of rebuilding the whole system.

---

1. Current System Idea

The reusable flow is:

User
↓
React Frontend
↓
FastAPI Backend
↓
Validation / Preprocessing
↓
Prediction Router
↓
Prediction Model / Adapter
↓
Risk / Forecast Interpretation
↓
LLM Explanation or Rule-Based Fallback
↓
Recommendation
↓
React Result + Visualization

Important rule:

The prediction must come from a predictive model / ML model.  
The LLM is only used to explain the prediction and support recommendations.

The LLM should not be used as the main prediction engine.

---

2. Current Technology Stack

Frontend
- React
- Vite
- Axios
- Recharts
- Lucide React

Backend
- Python 3.12
- FastAPI
- Uvicorn
- Pydantic
- python-dotenv

AI / ML
- Hugging Face Transformers
- PyTorch
- Adapter-based prediction structure
- Gemini-ready LLM service
- Rule-based fallback

Backup UI
- Streamlit

Optional Later
- Supabase
- SHAP
- Prediction history
- Authentication
- Reports

These optional features are not priority until the core demo works.

---

3. Important Python Version

Use:

Python 3.12

Do not use the old Python 3.14 interpreter that may exist on the computer.

The intended local virtual environment is:

.venv

---

4. Project Structure

Current structure is approximately:

Dormathon 2026 Team Lowkey Cute/
│
├── .venv/
│
├── backend/
│   ├── main.py
│   ├── config.py
│   │
│   ├── prediction/
│   │   ├── __init__.py
│   │   ├── model.py
│   │   ├── preprocess.py
│   │   ├── predict.py
│   │   │
│   │   ├── artifacts/
│   │   │
│   │   └── adapters/
│   │       ├── __init__.py
│   │       ├── forecasting_adapter.py
│   │       ├── text_adapter.py
│   │       └── tabular_adapter.py
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── risk_service.py
│   │   ├── recommendation_service.py
│   │   ├── llm_service.py
│   │   └── supabase_service.py
│   │
│   └── schemas/
│       ├── __init__.py
│       └── prediction.py
│
├── frontend/
│   ├── node_modules/
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── InputModeSelector.jsx
│       │   ├── InputPanel.jsx
│       │   ├── TextInputPanel.jsx
│       │   ├── TimeSeriesInputPanel.jsx
│       │   ├── SystemStatus.jsx
│       │   ├── PredictionCard.jsx
│       │   ├── PredictionChart.jsx
│       │   ├── ExplanationCard.jsx
│       │   └── RecommendationCard.jsx
│       │
│       ├── services/
│       │   └── api.js
│       │
│       ├── App.jsx
│       ├── index.css
│       └── main.jsx
│
├── prototype/
│   └── streamlit_app.py
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT_GUIDE.md
│   ├── TOMORROW_CHECKLIST.md
│   └── TEAM_HANDOFF.md
│
├── .env
├── .gitignore
├── README.md
└── requirements.txt

---

5. How to Start the Project from GitHub

Step 1 — Pull the latest version

If the repo already exists locally:

git status
git pull --rebase origin main

If cloning fresh:

git clone https://github.com/Kyosin-Yu/Taylors-Dormathon-2026-Low-Key-Cute.git
cd "Taylors-Dormathon-2026-Low-Key-Cute"

Do not force-push.

If a teammate pushed first and your push is rejected:

git pull --rebase origin main
git push origin main

---

6. Backend Setup

Open PowerShell in the project root.

Example:

D:\Dormathon 2026 Team Lowkey Cute

If .venv already exists

Activate it:

.\.venv\Scripts\Activate.ps1

You should see something like:

(.venv) PS D:\Dormathon 2026 Team Lowkey Cute>

Then install/update dependencies:

python -m pip install -r requirements.txt

If .venv does not exist

Create it using Python 3.12:

py -3.12 -m venv .venv

Activate:

.\.venv\Scripts\Activate.ps1

Install dependencies:

python -m pip install -r requirements.txt

Check Python:

python --version

Expected:

Python 3.12.x

---

7. Run the Backend

From the project root with .venv activated:

python -m uvicorn backend.main:app --reload

Backend should run at:

http://127.0.0.1:8000

Useful endpoints:

http://127.0.0.1:8000/
http://127.0.0.1:8000/health
http://127.0.0.1:8000/config
http://127.0.0.1:8000/docs

Swagger:

http://127.0.0.1:8000/docs

---

8. Current Backend Test

Current stable mock test:

{
"values": [80, 75, 90, 70]
}

Expected result:

Prediction: High
Score: 0.82
Support Source: fallback

Example explanation:

The model detected a high-risk pattern.

The backend has already returned:

HTTP 200

for this test.

---

9. Prediction Modes

The backend supports a router structure for multiple model types.

Main file:

backend/config.py

Possible modes:

PREDICTION_MODE = "mock"
PREDICTION_MODE = "tabular"
PREDICTION_MODE = "text"
PREDICTION_MODE = "forecasting"

For stable pre-hackathon testing, keep:

PREDICTION_MODE = "mock"

until the official problem is revealed.

---

10. Prediction Adapters

Tabular

Main file:

backend/prediction/adapters/tabular_adapter.py

Possible final models:

- Random Forest
- XGBoost
- Logistic Regression

Use this if the challenge uses:
- sensor values
- financial metrics
- customer data
- numeric features
- structured CSV data

---

Text

Main file:

backend/prediction/adapters/text_adapter.py

Possible final models:

- DistilBERT
- BERT
- DeBERTa
- Suitable Hugging Face classifier

A real Hugging Face model has already been tested successfully.

Proof-of-concept model used:

distilbert-base-uncased-finetuned-sst-2-english

Important:

This is only a connectivity / architecture test model.

It is not the final semantic model for the hackathon.

---

Forecasting / Time Series

Main file:

backend/prediction/adapters/forecasting_adapter.py

Possible final models:

- Chronos
- TimesFM
- Other suitable pretrained forecasting models

Use this if the challenge requires forecasting future values from historical values.

---

11. Frontend Setup

The frontend is React + Vite.

Open a second terminal.

Go to:

cd frontend

If dependencies are not installed:

npm install

Current extra dependencies include:

axios
recharts
lucide-react

Start frontend:

npm run dev

Expected URL:

http://localhost:5173/

Important:

If the terminal already shows:

PS ...\frontend>

do not run cd frontend again.

Just run:

npm run dev

---

12. Recommended Two-Terminal Setup

Terminal 1 — Backend

Directory:

D:\Dormathon 2026 Team Lowkey Cute

Commands:

.\.venv\Scripts\Activate.ps1
python -m uvicorn backend.main:app --reload

Terminal 2 — Frontend

Directory:

D:\Dormathon 2026 Team Lowkey Cute\frontend

Command:

npm run dev

---

13. Frontend Input Modes

The frontend is currently prepared for three generic input modes.

Numeric / Tabular

Component:

frontend/src/components/InputPanel.jsx

Current generic fields:

Feature 1
Feature 2
Feature 3
Feature 4

After the real problem reveal, rename them to actual domain features.

Example:

Temperature
Pressure
Vibration
Machine Age

---

Text

Component:

frontend/src/components/TextInputPanel.jsx

Used for:
- complaints
- reports
- reviews
- incident descriptions
- free-form text

---

Time Series

Component:

frontend/src/components/TimeSeriesInputPanel.jsx

Current generic input format:

10, 15, 20, 25, 30

Later this can be changed into:
- CSV upload
- historical chart
- timestamp/value input
- sensor history

---

14. Frontend Result Components

The frontend has already been split into reusable components.

PredictionCard.jsx
PredictionChart.jsx
ExplanationCard.jsx
RecommendationCard.jsx

This is intentional.

Tomorrow, avoid rewriting App.jsx.

Change individual components only where needed.

---

15. System Status Component

The frontend shows:

Backend: Online / Offline
Prediction Mode: mock / tabular / text / forecasting

Component:

frontend/src/components/SystemStatus.jsx

This helps identify whether a failure is:
- backend connection problem
- wrong model mode
- frontend problem

---

16. React → FastAPI Integration

This full path has already been tested:

React
↓
Axios
↓
FastAPI
↓
Prediction Router
↓
Mock Model
↓
Risk Service
↓
LLM / Fallback
↓
React Result

Test values:
80
75
90
70

Result:
High
82%
The integration is working.

---

17. CORS

FastAPI has CORS enabled for the local React dev server.
Expected origins include:
http://localhost:5173
http://127.0.0.1:5173
This allows React to call FastAPI locally.

---

18. LLM Status

Current status:

LLM service structure      DONE
Gemini-ready integration   DONE
.env support               DONE
Fallback mechanism         DONE
Real Gemini API test       NOT YET DONE

Why the final test is not done:
No Gemini API key has been configured yet.

Current system behavior:
Prediction
↓
Try Gemini
↓
No API key / API failure
↓
Fallback
↓
Explanation + Recommendations

This is intentional so the app never depends completely on an external LLM.

---

19. Gemini Setup

Root file:
.env

Use:
GEMINI_API_KEY=YOUR_KEY_HERE
(Do not commit this key.)

.env is ignored by Git.
After adding the key:

1. Stop the backend.
2. Restart FastAPI.
3. Run a prediction.
4. Check:

Support Source: llm
If Gemini is unavailable:
Support Source: fallback
is acceptable and the demo should still work.

---

20. Recommendation Logic

Current recommendations are intentionally safe and rule-based.
Example for High risk:
1. Review the strongest contributing factors immediately.
2. Take preventive action before the predicted issue occurs.
3. Monitor the situation closely.

The LLM is currently mainly used for explanation.
The recommendation fallback remains available for reliability.

---

21. Streamlit Backup

If the React frontend fails during the hackathon, use Streamlit.
Run from project root with .venv activated:
python -m streamlit run prototype\streamlit_app.py
The Streamlit prototype has already been tested successfully.
This is the emergency backup UI.

---

22. What Has Been Completed

Approximate reusable preparation status:

Git / repository setup            100%
Python 3.12 environment           100%
FastAPI backend skeleton          100%
Prediction endpoint               100%
Mock prediction                   100%
Risk interpretation               100%
Fallback recommendations          100%
Hugging Face adapter structure    100%
Real HF test                      100%
Streamlit backup                  100%
React frontend                    100%
React → FastAPI connection        100%
CORS                              100%
Reusable React components         100%
Input mode preparation            100%
System status                     100%
Prediction chart                  Working
LLM structure                     ~90%
Real Gemini API test              Pending
Final dataset                     Pending reveal
Final model                       Pending reveal
Domain-specific logic             Pending reveal
Final UI                          Pending reveal
Deployment                        Pending

Overall reusable preparation:
Approximately 85%

The remaining work mainly depends on the official problem statement.

---

23. What NOT to Do Before the Reveal

Avoid spending time on:
- complicated authentication
- microservices
- major architecture rewrites
- custom deep-learning training without a reason
- Supabase unless the challenge needs history/storage
- fancy animations
- unnecessary pages
- final domain labels before knowing the domain

The current architecture is already enough to start the hackathon quickly.

---

24. What to Do Immediately After the Problem Reveal

Do not start coding immediately.
First determine:

1. What is the problem?
2. Who is the user?
3. What exactly are we predicting?
4. What action should the user take after seeing the prediction?
5. What data is available?
6. Is this tabular, text, or time series?

Write one sentence:
Given __________, predict __________.
Example:
Given machine sensor readings, predict equipment failure risk.

---

25. Domain Switch Map

If Tabular
Set:
PREDICTION_MODE = "tabular"
Main backend:
backend/prediction/adapters/tabular_adapter.py
Main frontend:
frontend/src/components/InputPanel.jsx

---

If Text
Set:
PREDICTION_MODE = "text"
Main backend:
backend/prediction/adapters/text_adapter.py
Main frontend:
frontend/src/components/TextInputPanel.jsx

---

If Time Series
Set:
PREDICTION_MODE = "forecasting"
Main backend:
backend/prediction/adapters/forecasting_adapter.py
Main frontend:
frontend/src/components/TimeSeriesInputPanel.jsx

---

26. Development Priority

P0 — Must Work
Input
Prediction
Interpretation
Explanation
Recommendation
Working demo

P1 — Add After P0 Works
Better dashboard
Charts
Feature importance
Better domain wording
LLM explanation

P2 — Only If There Is Extra Time
Supabase
Prediction history
Authentication
SHAP
PDF/report export
Animations
Extra pages

---

27. Git Workflow During the Hackathon

Before starting:
git status
git pull --rebase origin main

After a stable milestone:
git add .
git commit -m "describe the milestone"
git pull --rebase origin main
git push origin main

If conflicts occur:
Do not force-push.
Resolve conflicts carefully, continue the rebase, then push.

---

28. Current Recommended Stable Mode

Before the official challenge reveal:
PREDICTION_MODE = "mock"
This keeps the currently tested pipeline stable.
Do not switch permanently to text or forecasting just for testing.

---

29. Team Role Suggestion

For a four-person team:
Technical Member 1
- backend
- prediction model
- preprocessing
- integration

Technical Member 2
- React
- visualization
- API integration
- debugging

Other Team Members
Can work on:
- problem understanding
- target user
- business impact
- dataset research
- UI flow
- test cases
- slides
- demo script
- documentation
- presentation story
- 
Everyone does not need to code.

---

30. Demo Story
The final demo should answer three questions clearly:

1. What will happen?
Prediction / Risk / Forecast

2. Why?
Important contributing factors / explanation

3. What should the user do?
Actionable recommendation
The product is not only a predictor.

It is a:
Predictive Decision-Support System

---

31. Emergency Rules

If the advanced model breaks:
Use a simpler working model.
If Gemini breaks:
Use fallback.
If React breaks:
Use Streamlit.
If an optional feature breaks:
Remove it from the demo.
A stable working system is more valuable than an unfinished complex system.

---

32. Quick Start Summary

For a teammate who only wants to run the project:

Backend terminal

cd "D:\Dormathon 2026 Team Lowkey Cute"
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn backend.main:app --reload

Frontend terminal

cd "D:\Dormathon 2026 Team Lowkey Cute\frontend"
npm install
npm run dev

Open:
http://localhost:5173/
Backend docs:
http://127.0.0.1:8000/docs

Current test:
80, 75, 90, 70

Expected:
High
82%
Support Source: fallback

---

33. Final Context

The project is intentionally designed so that the domain can be swapped quickly after the Dormathon problem statement is revealed.

Do not rebuild the application from zero.

The expected workflow tomorrow is:

Problem Reveal
↓
Understand Prediction Target
↓
Identify Input Type
↓
Choose Relevant Adapter
↓
Implement / Load Model
↓
Adjust Preprocessing
↓
Rename Frontend Inputs
↓
Adjust Visualization
↓
Test End-to-End
↓
Freeze Features
↓
Polish Demo + Slides

The reusable foundation is already working.