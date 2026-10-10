// src/api.js  -  every backend call lives here
import axios from "axios";

// Set VITE_API_URL in frontend/.env to change the backend address.
export const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

export const checkHealth = () => api.get("/health").then((r) => r.data);

export const predict = (values) => api.post("/predict", { values }).then((r) => r.data);

export const chat = (payload) => api.post("/chat", payload).then((r) => r.data);

// Turns an axios error into a message people can act on.
export function errorMessage(err) {
  if (err.code === "ECONNABORTED") return "The backend took too long to respond. Try again.";
  if (!err.response) return `Can't reach the backend at ${BASE_URL}. Is it running?`;
  const detail = err.response.data?.detail;
  return typeof detail === "string" ? detail : `The backend returned an error (${err.response.status}).`;
}

// Fills in safe defaults so a missing field never crashes the page.
export function normalizePrediction(d) {
  return {
    prediction: {
      label: d?.prediction?.label ?? "Unknown",
      score: Number(d?.prediction?.score ?? 0),
    },
    explanation: d?.explanation ?? "",
    recommendations: Array.isArray(d?.recommendations) ? d.recommendations : [],
    support_source: d?.support_source ?? "n/a",
  };
}