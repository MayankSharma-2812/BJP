// Standard API response helpers
// References: docs/06_API_CONTRACT.md, docs/03_TRD.md

import { NextResponse } from 'next/server';
import type { ApiErrorCode, ApiErrorResponse } from '@/types/api';

const DEFAULT_STATUS_MAP: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_FAILED: 400,
  PAYLOAD_TOO_LARGE: 413,
  INVALID_STATE_TRANSITION: 409,
  RECOVERY_NOT_READY: 400,
  RECOVERY_WINDOW_EXPIRED: 410,
  DUPLICATE_DECISION: 409,
  RATE_LIMITED: 429,
  REVISION_CONFLICT: 409,
  INVITE_INVALID_OR_EXPIRED: 400,
  INTERNAL_ERROR: 500,
};

export const NO_STORE_HEADERS: HeadersInit = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export function jsonResponse<T>(data: T, status = 200, headers: HeadersInit = {}): NextResponse<T> {
  return NextResponse.json(data, {
    status,
    headers: {
      ...NO_STORE_HEADERS,
      ...headers,
    },
  });
}

export function errorResponse(
  code: ApiErrorCode,
  message: string,
  options?: { status?: number; requestId?: string; headers?: HeadersInit }
): NextResponse<ApiErrorResponse> {
  const status = options?.status ?? DEFAULT_STATUS_MAP[code] ?? 400;
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(options?.requestId ? { requestId: options.requestId } : {}),
    },
  };

  return NextResponse.json(body, {
    status,
    headers: {
      ...NO_STORE_HEADERS,
      ...(options?.headers ?? {}),
    },
  });
}
