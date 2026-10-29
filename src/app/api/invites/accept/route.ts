// POST /api/invites/accept - Accept a nominee invitation
// References: docs/06_API_CONTRACT.md, docs/05_BACKEND_SCHEMA.md

import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/server/auth';
import { acceptInvite, DbError } from '@/lib/server/db';
import type { AcceptInviteRequest, AcceptInviteResponse, ApiErrorCode } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse('UNAUTHENTICATED', 'Sign in required to accept invitation.');
    }

    const body = (await request.json().catch(() => null)) as Partial<AcceptInviteRequest>;
    if (!body || typeof body.inviteToken !== 'string' || !body.inviteToken.trim()) {
      return errorResponse('VALIDATION_FAILED', 'Invalid or missing inviteToken.');
    }

    const result = await acceptInvite(body.inviteToken.trim(), user.id);

    const responseData: AcceptInviteResponse = {
      nomineeId: result.nomineeId,
      vaultId: result.vaultId,
      status: 'active',
      acceptedAt: result.acceptedAt,
    };

    return jsonResponse(responseData);
  } catch (err) {
    if (err instanceof DbError) {
      return errorResponse(err.code as ApiErrorCode, err.message);
    }
    return errorResponse('INTERNAL_ERROR', 'Failed to accept invitation.');
  }
}
