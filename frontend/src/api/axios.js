import axios from 'axios';
import { clearAuthStorage, getAuthToken, setMustResetPassword } from '../utils/auth';

const PRIMARY_API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';
const FALLBACK_API_BASE_URL = 'http://127.0.0.1:8002/api/v1';

const isPrimaryHost = (base) => String(base || '').includes(':8000');

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
    const originalConfig = error?.config || {};
    const code = String(error?.code || '');
    const status = error?.response?.status;
    const hasNetworkFailure = !status && (code === 'ECONNABORTED' || code === 'ERR_NETWORK' || code === 'ERR_BAD_RESPONSE');

    if (
      hasNetworkFailure
      && !originalConfig._retriedOnFallback
      && isPrimaryHost(originalConfig.baseURL || api.defaults.baseURL)
      && !import.meta.env.VITE_API_URL
    ) {
      originalConfig._retriedOnFallback = true;
      originalConfig.baseURL = FALLBACK_API_BASE_URL;
      // NOTE: Do NOT mutate api.defaults.baseURL here — that would permanently
      // redirect all future requests to the fallback port after a single failure.
      return api(originalConfig);
    }

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
