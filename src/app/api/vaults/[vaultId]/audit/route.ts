import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/server/auth';
import { DbError, getAuditTrailDb } from '@/lib/server/db';
import type { ApiErrorCode } from '@/types/api';

interface RouteContext {
  params: Promise<{ vaultId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse('UNAUTHENTICATED', 'Authentication required to view audit trail.');
    }

    const { vaultId } = await context.params;
    if (!vaultId) {
      return errorResponse('VALIDATION_FAILED', 'Missing vaultId parameter.');
    }

    const auditTrail = await getAuditTrailDb(vaultId, user.id);
    return jsonResponse(auditTrail);
  } catch (err) {
    if (err instanceof DbError) {
      return errorResponse(err.code as ApiErrorCode, err.message);
    }
    return errorResponse('INTERNAL_ERROR', 'Failed to retrieve audit trail.');
  }
}
