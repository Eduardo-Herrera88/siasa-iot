import axios from "axios";
import { useAuthStore } from "../store/auth.store";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

export const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const { refreshToken, clear, setAccessToken } = useAuthStore.getState();
  if (!refreshToken) {
    clear();
    throw new Error("Sesion expirada");
  }

  const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
  setAccessToken(data.accessToken);
  return data.accessToken;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch (refreshError) {
        useAuthStore.getState().clear();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);
