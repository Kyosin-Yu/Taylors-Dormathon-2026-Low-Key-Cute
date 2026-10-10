import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";


export async function getHealth() {
  const response = await axios.get(
    `${API_BASE_URL}/health`
  );

  return response.data;
}


export async function getConfig() {
  const response = await axios.get(
    `${API_BASE_URL}/config`
  );

  return response.data;
}


export async function runTabularPrediction(values) {
  const response = await axios.post(
    `${API_BASE_URL}/predict`,
    {
      values: values,
    }
  );

  return response.data;
}


export async function runTextPrediction(text) {
  const response = await axios.post(
    `${API_BASE_URL}/predict`,
    {
      text: text,
    }
  );

  return response.data;
}


export async function runForecastingPrediction(features) {
  const response = await axios.post(
    `${API_BASE_URL}/predict`,
    {
      features: features,
    }
  );

  return response.data;
}