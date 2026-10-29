import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/server/auth';
import { DbError, recordNomineeDecisionDb } from '@/lib/server/db';
import { DecisionRequestSchema, type ApiErrorCode } from '@/types/api';

interface RouteContext {
  params: Promise<{ requestId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse('UNAUTHENTICATED', 'Authentication required to submit approval.');
    }

    const { requestId } = await context.params;
    if (!requestId) {
      return errorResponse('VALIDATION_FAILED', 'Missing requestId parameter.');
    }

    const body = await request.json().catch(() => null);
    const parseResult = DecisionRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(
        'VALIDATION_FAILED',
        `Invalid decision payload: ${parseResult.error.issues[0]?.message || 'malformed request'}`
      );
    }

    const { decision, idempotencyKey } = parseResult.data;
    const result = await recordNomineeDecisionDb(requestId, user.id, decision, idempotencyKey);

    return jsonResponse(result);
  } catch (err) {
    if (err instanceof DbError) {
      return errorResponse(err.code as ApiErrorCode, err.message);
    }
    return errorResponse('INTERNAL_ERROR', 'Failed to record nominee decision.');
  }
}
