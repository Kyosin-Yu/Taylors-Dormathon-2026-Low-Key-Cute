# Deploy React and FastAPI together

The Dockerfile builds React and serves its output through FastAPI. Both use
the same HTTPS origin, so no separate frontend hosting or CORS setup is needed.
This deployment supports the forecasting model and Gemini chatbot.

## Live hackathon deployment

- App: https://lowkey-cute-predictiveops.onrender.com
- Dashboard: https://dashboard.render.com/web/srv-db56bnqd0e5s73ec1go0
- Hosting: Render Free, Docker, Singapore, GitHub `main` with automatic deploys.
- Verified on 11 October 2026: frontend loads, `/health` is healthy,
  `/predict` returns a valid Random Forest RUL, and `/chat` returns a Gemini answer.
- Gemini credentials are stored in Render environment settings.

## Render (hackathon setup)

1. Commit and push the merged app, graph, sample CSV and deployment files to
   your GitHub repository. Do not include `.env` or `.venv`.
2. Create an account at https://dashboard.render.com using GitHub.
3. Select **New > Blueprint**, connect this repository, and select the branch
   containing these files. Render reads `render.yaml` from the repository root.
4. Enter `GEMINI_API_KEY` in Render's environment settings for chatbot support.
   Use the key from your local setup; never put it in frontend code or Git.
   If you use another Gemini model locally, also set `GEMINI_MODEL` to that name.
5. Confirm the Free service and deploy. Wait for the build and `/health` check
   to pass, then open the service's `https://…onrender.com` URL.
6. Upload the time series sample, switch sensors and engine rows, run a
   prediction, and ask the chatbot to explain the result.

No build or start command is needed in the dashboard: the Dockerfile handles
both. Leave `VITE_API_URL` unset; production calls use the page's own origin.
Render supplies `PORT`; Uvicorn binds to `0.0.0.0`.

The free service sleeps after 15 minutes without traffic and can take about
one minute to wake. Open the deployed URL before your pitch. Browser session
history is cleared on reload. Keep the local `Start Demo.bat` as a fallback.

Sources: https://render.com/docs/docker, https://render.com/docs/web-services,
https://render.com/docs/free, https://render.com/docs/blueprint-spec.

## Local container verification (requires Docker)

```powershell
docker build -t predictiveops .
docker run --rm -p 10000:10000 --env-file .env predictiveops
```

Open http://localhost:10000 and check http://localhost:10000/health.
The runtime requirements exclude unused PyTorch, Transformers and Streamlit
packages. The saved Random Forest and its matching scikit-learn version are
included. The processed training CSV is included for chatbot dataset context.

## Time series graph

Upload `frontend/public/cmapss-timeseries-sample.csv` (479 real training rows
for engines 1 and 2), or your own CSV with the 17 required numeric features.
`unit_number` is optional but recommended for files with multiple engines.
The chart sorts by `time_cycles`, displays one selected sensor and engine,
and marks the selected prediction row. The row selector can access every row,
including those beyond the five-row preview. Repeated cycles within an engine
are flagged rather than connected into a misleading trajectory.

The graph displays measured sensor history, not future sensor forecasts or
batch RUL predictions. Each prediction still analyzes the selected row only.
