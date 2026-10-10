// src/api.js  -  every backend call lives here
import axios from "axios";

// Set VITE_API_URL in frontend/.env to change the backend address.
export const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://127.0.0.1:8000" : window.location.origin);

const api = axios.create({ baseURL: BASE_URL, timeout: 60000 });

export const checkHealth = () => Promise.all([api.get("/health"), api.get("/config")]).then(([, config]) => config.data);

export const predict = (features) => api.post("/predict", { features }).then((r) => r.data);

// Calls the backend's /chat endpoint (AI assistant).
// Longer timeout: the backend may try a fallback model if the first one is slow.
export const chat = (question, prediction = null) =>
  api
    .post("/chat", { question, prediction }, { timeout: 90000 })
    .then((r) => r.data.answer);

// Turns an axios error into a message people can act on.
export function errorMessage(err) {
  if (err.code === "ECONNABORTED") return "The backend took too long to respond. Try again.";
  if (!err.isAxiosError) return err.message || "Request failed.";
  if (!err.response) return `Can't reach the backend at ${BASE_URL}. Is it running?`;
  const detail = err.response.data?.detail;
  return typeof detail === "string" ? detail : `The backend returned an error (${err.response.status}).`;
}

// Fills in safe defaults so a missing field never crashes the page.
export function normalizePrediction(d) {
  if (!Number.isFinite(d?.prediction?.rul)) throw new Error("The backend did not return a valid RUL forecast. Check its prediction mode.");
  return {
    prediction: {
      rul: Number(d?.prediction?.rul),
      model: d?.prediction?.model ?? "Unknown",
    },
    risk_level: d?.risk_level ?? "Unknown",
    priority: d?.priority ?? 0,
    risk_message: d?.risk_message ?? "",
    explanation: d?.explanation ?? "",
    recommendations: Array.isArray(d?.recommendations) ? d.recommendations : [],
    support_source: d?.support_source ?? "n/a",
    factors: Array.isArray(d?.factors) ? d.factors : [],
    decision: d?.decision ?? null,
  };
}