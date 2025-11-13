import { AxiosError } from 'axios';
import { ErrorResponse } from './types';

export class ApiError extends Error {
  statusCode: number;
  detail: string;

  constructor(statusCode: number, detail: string) {
    super(detail);
    this.statusCode = statusCode;
    this.detail = detail;
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const errorData = error.response?.data as ErrorResponse;
    const statusCode = error.response?.status || 500;
    const detail = errorData?.detail || error.message || 'An error occurred';
    
    return new ApiError(statusCode, detail);
  }

  if (error instanceof Error) {
    return new ApiError(500, error.message);
  }

  return new ApiError(500, 'An unknown error occurred');
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
