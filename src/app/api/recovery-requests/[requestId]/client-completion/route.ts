import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/server/auth';
import { DbError, recordClientCompletionDb } from '@/lib/server/db';
import { ClientCompletionRequestSchema, type ApiErrorCode } from '@/types/api';

interface RouteContext {
  params: Promise<{ requestId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse('UNAUTHENTICATED', 'Authentication required.');
    }

    const { requestId } = await context.params;
    if (!requestId) {
      return errorResponse('VALIDATION_FAILED', 'Missing requestId parameter.');
    }

    const body = await request.json().catch(() => null);
    const parseResult = ClientCompletionRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse('VALIDATION_FAILED', 'Invalid client completion payload.');
    }

    const { clientSessionId, completedAt } = parseResult.data;
    const result = await recordClientCompletionDb(requestId, clientSessionId, completedAt);

    return jsonResponse(result);
  } catch (err) {
    if (err instanceof DbError) {
      return errorResponse(err.code as ApiErrorCode, err.message);
    }
    return errorResponse('INTERNAL_ERROR', 'Failed to record completion report.');
  }
}
