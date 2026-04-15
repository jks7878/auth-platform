// src/api/types.ts
import type { InternalAxiosRequestConfig } from 'axios';

export type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  skipSilentRefresh?: boolean;
  skipAuthRedirect?: boolean;
};
