import axios from 'axios'

// In development, Vite proxies /api to the backend (see vite.config.ts).
// In production, set VITE_API_BASE_URL to the backend's public URL.
const baseURL = import.meta.env.VITE_API_BASE_URL || ''

export const api = axios.create({
  baseURL,
  withCredentials: true,
})
