// frontend/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000"
});

// attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`; // matches your middleware
  }
  return config;
});

export default api;