import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/server/auth';
import { DbError, cancelRecoveryDb } from '@/lib/server/db';
import type { ApiErrorCode } from '@/types/api';

interface RouteContext {
  params: Promise<{ requestId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse('UNAUTHENTICATED', 'Authentication required to cancel recovery.');
    }

    const { requestId } = await context.params;
    if (!requestId) {
      return errorResponse('VALIDATION_FAILED', 'Missing requestId parameter.');
    }

    const result = await cancelRecoveryDb(requestId, user.id);
    return jsonResponse(result);
  } catch (err) {
    if (err instanceof DbError) {
      return errorResponse(err.code as ApiErrorCode, err.message);
    }
    return errorResponse('INTERNAL_ERROR', 'Failed to cancel recovery.');
  }
}
