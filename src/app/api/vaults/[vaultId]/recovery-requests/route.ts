import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/server/auth';
import { DbError, getOrCreateRecoveryRequestDb } from '@/lib/server/db';
import type { ApiErrorCode } from '@/types/api';

interface RouteContext {
  params: Promise<{ vaultId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse('UNAUTHENTICATED', 'Authentication required.');
    }

    const { vaultId } = await context.params;
    if (!vaultId) {
      return errorResponse('VALIDATION_FAILED', 'Missing vaultId parameter.');
    }

    const recoveryRequest = await getOrCreateRecoveryRequestDb(vaultId, user.id);
    return jsonResponse(recoveryRequest, 201);
  } catch (err) {
    if (err instanceof DbError) {
      return errorResponse(err.code as ApiErrorCode, err.message);
    }
    return errorResponse('INTERNAL_ERROR', 'Failed to process recovery request.');
  }
}
