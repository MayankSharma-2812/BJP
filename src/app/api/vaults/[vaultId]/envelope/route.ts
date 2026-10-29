// PUT /api/vaults/:vaultId/envelope - Update encrypted payload envelope
// References: docs/06_API_CONTRACT.md, docs/05_BACKEND_SCHEMA.md

import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/server/auth';
import { DbError, updateVaultEnvelope } from '@/lib/server/db';
import { validateUpdateEnvelopeRequest, ValidationError } from '@/lib/server/validation';
import type { ApiErrorCode, UpdateEnvelopeResponse } from '@/types/api';

interface RouteContext {
  params: Promise<{ vaultId: string }>;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse('UNAUTHENTICATED', 'Authentication required.');
    }

    const { vaultId } = await context.params;
    if (!vaultId) {
      return errorResponse('VALIDATION_FAILED', 'Missing vaultId parameter.');
    }

    const body = await request.json().catch(() => null);
    const validatedData = validateUpdateEnvelopeRequest(body);

    const updatedVault = await updateVaultEnvelope(vaultId, user.id, validatedData);

    const responseData: UpdateEnvelopeResponse = {
      vaultId: updatedVault.id,
      revision: updatedVault.revision,
      updatedAt: updatedVault.updated_at,
    };

    return jsonResponse(responseData);
  } catch (err) {
    if (err instanceof ValidationError) {
      return errorResponse('VALIDATION_FAILED', err.message);
    }
    if (err instanceof DbError) {
      return errorResponse(err.code as ApiErrorCode, err.message);
    }
    return errorResponse('INTERNAL_ERROR', 'Failed to update vault envelope.');
  }
}
