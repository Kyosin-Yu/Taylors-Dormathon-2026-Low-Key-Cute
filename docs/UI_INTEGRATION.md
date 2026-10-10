# Afrah UI integration

The UI comes from `origin/afrah's-Lab`, primarily `frontend/src/App.jsx`
(JSX, not App.js). The integration branch is `integrate-afrah-ui`.
Only the UI files were imported; the current main backend, model and datasets
remain in place.

## Run locally

For pitching, double-click `Start Demo.bat` in the repository root, or run
`python App.py`. This serves the frontend and backend together on port 8080 and
opens the browser after startup. Press Ctrl+C in the launcher terminal to stop.

The commands below are the optional development workflow with separate servers.

From the repository root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000
```

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The backend must use `PREDICTION_MODE = "forecasting"`.
Set `VITE_API_URL` in `frontend/.env` if the API address changes; restart Vite.
The backend currently allows frontend origins on port 5173.

## Input and output

- CSV upload is the only sensor input method. All 17 required feature columns must be present; the overview is read-only.
- Upload `frontend/public/cmapss-sample.csv` to try CSV input. Columns are mapped
  by exact feature name, regardless of order. Extra columns are ignored.
- Every row must contain finite numeric values for all required features.
- The first five rows are previewed and selectable. One selected row is sent
  to `/predict` as `{ "features": { ... } }`; uploads are not batch predictions.
- Results display RUL in operating cycles, backend risk and priority, model,
  explanation, recommendations and support source. RUL is not failure probability.
- Dashboard counts and history reflect analyses in this browser session only;
  repeated analyses are counted separately. Reloading clears history.

## Current feature boundaries

The backend has `/health`, `/config`, `/predict` and `/chat` endpoints.
The AI assistant sends questions and the latest prediction to the backend chatbot.
Image uploads are not supported. Alerts,
Maintenance and Insights retain Afrah's coming-soon pages.

The backend's existing LLM explanation function expects classification fields;
RUL results currently use its fallback explanation. RUL recommendations still
come from the backend's dedicated maintenance rules.

## Checks

```powershell
cd frontend
npm run build
npm run lint
node --test src/services/csv.test.js
```

