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

- CSV upload is the only sensor input method; the overview is read-only.
  Sensor history accepts available sensor_* columns. RUL prediction still requires
  all 17 model features to be numeric on the selected row.
- Upload `frontend/public/cmapss-sample.csv` to try CSV input. Columns are mapped
  by exact feature name, regardless of order. Extra columns are ignored.
- Invalid historical sensor values are omitted from the selected sensor's chart.
  An invalid analyzed row disables RUL prediction without discarding the upload.
- The first five rows are previewed and selectable. The history controls select
  an engine and any valid operating cycle. One selected row is sent
  to `/predict` as `{ "features": { ... } }`; uploads are not batch predictions.
- Results display RUL in operating cycles, backend risk and priority, model,
  explanation, recommendations and support source. RUL is not failure probability.
- Dashboard counts and history reflect analyses in this browser session only;
  repeated analyses are counted separately. Reloading clears history.

## Historical sensor chart

The Engine / Unit selector uses exact unit_number values. Analyze at Cycle
lists that engine's valid cycles in ascending order. Uploads default to the
first engine's latest valid cycle; switching engines selects its latest cycle.
Only rows from that engine with time_cycles <= the analyzed cycle enter the
plot, current-point highlight, or descriptive statistics. Sensor options come
from the CSV's sensor_* headers. No backend/model logic is changed.

Without unit_number, multiple rows are treated as one engine with an explicit
identity warning. Use a single-engine file in that case. Missing time_cycles,
invalid selected cycles, empty data, or absent sensor columns display errors.
Invalid sensor readings are excluded; every row sharing a duplicate cycle for
the chosen engine is excluded with a notice instead of silently picking a value.
An engine with one valid measurement shows one point and an insufficient-history
message. This also applies when only one observation exists before the selected
decision cycle, even if the uploaded file contains later cycles.

### Manual checks

1. Upload frontend/public/cmapss-timeseries-sample.csv. Engine 1 opens at cycle
   192 with 192 measurements. Engine 2 opens at cycle 287 with 287 measurements.
2. Choose Engine 1, Analyze at Cycle 50. Confirm 50 measurements, an x-axis
   ending at 50, and an orange current point with a dashed cycle marker.
3. Switch sensors; confirm the Y-axis and tooltip use the chosen sensor.
4. Upload frontend/public/cmapss-sample.csv. Confirm one point, the identity
   warning, and the insufficient-history message.
5. Clear a historical sensor value in a copy of the CSV, then upload it.
   Confirm the exclusion notice and that other valid history still plots.
   Select that incomplete row: RUL prediction must be disabled.
6. Duplicate a cycle, remove time_cycles, or upload an empty file in separate
   copies. Confirm the duplicate exclusion notice or clear validation error.

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
node --test src/services/csv.test.js src/services/timeSeries.test.js
```

