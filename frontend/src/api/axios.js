import axios from 'axios';
import { clearAuthStorage, getAuthToken, setMustResetPassword } from '../utils/auth';

const PRIMARY_API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: PRIMARY_API_BASE_URL,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const detail = String(error?.response?.data?.detail || '').toLowerCase();

    if (typeof window !== 'undefined') {
      const path = window.location.pathname;

      if (status === 401) {
        clearAuthStorage();
        if (path !== '/login' && path !== '/signup') {
          window.location.href = '/login';
        }
      }

      if (status === 403 && detail.includes('password reset required')) {
        setMustResetPassword(true);
        if (path !== '/reset-password') {
          window.location.href = '/reset-password';
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
