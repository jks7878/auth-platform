import axios, { AxiosError } from 'axios';
import type { RetryableRequestConfig } from './types';

type AuthFlowEventDetail = {
  type: 'silent_refresh_succeeded' | 'silent_refresh_failed';
  url?: string;
  message: string;
  timestamp: number;
};

type ApiErrorBody = {
  message?: string;
  code?: string;
};

function emitAuthFlowEvent(detail: AuthFlowEventDetail) {
  window.dispatchEvent(
    new CustomEvent<AuthFlowEventDetail>('auth-flow-event', { detail }),
  );
}

function isRefreshTokenReuseError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;

  const data = error.response?.data as ApiErrorBody | undefined;
  alert(data?.message)
  alert(data?.code)
  return data?.code === 'REFRESH_TOKEN_REUSE';
}

export const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const requestUrl = originalRequest.url ?? '';
    const isRefreshRequest = requestUrl.includes('/auth/refresh');

    if (originalRequest.skipSilentRefresh) {
      return Promise.reject(error);
    }

    if (status === 401 && !originalRequest._retry && !isRefreshRequest) {
      originalRequest._retry = true;

      try {
        await api.post('/auth/refresh');

        emitAuthFlowEvent({
          type: 'silent_refresh_succeeded',
          url: requestUrl,
          message: `Silent refresh succeeded → ${requestUrl}`,
          timestamp: Date.now(),
        });

        return api(originalRequest);
      } catch (refreshError) {
        emitAuthFlowEvent({
          type: 'silent_refresh_failed',
          url: requestUrl,
          message: `Silent refresh failed → ${requestUrl}`,
          timestamp: Date.now(),
        });
        
        if (isRefreshTokenReuseError(refreshError)) {
          return Promise.reject(refreshError);
        }

        if (!originalRequest.skipAuthRedirect) {
          window.location.href = '/';
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
