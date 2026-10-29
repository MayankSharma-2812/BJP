import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/server/auth';
import { DbError, getRecoverySessionDb } from '@/lib/server/db';
import type { ApiErrorCode } from '@/types/api';

interface RouteContext {
  params: Promise<{ requestId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse('UNAUTHENTICATED', 'Authentication required.');
    }

    const { requestId } = await context.params;
    if (!requestId) {
      return errorResponse('VALIDATION_FAILED', 'Missing requestId parameter.');
    }

    const session = await getRecoverySessionDb(requestId, user.id);
    return jsonResponse(session);
  } catch (err) {
    if (err instanceof DbError) {
      return errorResponse(err.code as ApiErrorCode, err.message);
    }
    return errorResponse('INTERNAL_ERROR', 'Failed to retrieve recovery session.');
  }
}
