// POST /api/vaults/:vaultId/nominees - Configure 3-nominee recovery roster
// References: docs/06_API_CONTRACT.md, docs/05_BACKEND_SCHEMA.md

import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/server/auth';
import { DbError, setVaultNominees } from '@/lib/server/db';
import { validateSetNomineesRequest, ValidationError } from '@/lib/server/validation';
import type { ApiErrorCode, SetNomineesResponse } from '@/types/api';

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

    const body = await request.json().catch(() => null);
    const validatedData = validateSetNomineesRequest(body);

    const nomineeResults = await setVaultNominees(vaultId, user.id, validatedData.nominees);

    const responseData: SetNomineesResponse = {
      vaultId,
      nominees: nomineeResults,
    };

    return jsonResponse(responseData, 201);
  } catch (err) {
    if (err instanceof ValidationError) {
      return errorResponse('VALIDATION_FAILED', err.message);
    }
    if (err instanceof DbError) {
      return errorResponse(err.code as ApiErrorCode, err.message);
    }
    return errorResponse('INTERNAL_ERROR', 'Failed to configure vault nominees.');
  }
}
