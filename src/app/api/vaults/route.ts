// POST /api/vaults - Create a vault envelope
// References: docs/06_API_CONTRACT.md, docs/05_BACKEND_SCHEMA.md

import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/server/auth';
import { createVault, DbError } from '@/lib/server/db';
import { validateCreateVaultRequest, ValidationError } from '@/lib/server/validation';
import type { ApiErrorCode, CreateVaultResponse } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse('UNAUTHENTICATED', 'Authentication required to create a vault.');
    }

    const body = await request.json().catch(() => null);
    const validatedData = validateCreateVaultRequest(body);

    const vault = await createVault(user.id, validatedData);

    const responseData: CreateVaultResponse = {
      vaultId: vault.id,
      status: vault.status,
      revision: vault.revision,
      nextCheckinAt: vault.next_checkin_at,
      createdAt: vault.created_at,
    };

    return jsonResponse(responseData, 201);
  } catch (err) {
    if (err instanceof ValidationError) {
      return errorResponse('VALIDATION_FAILED', err.message);
    }
    if (err instanceof DbError) {
      return errorResponse(err.code as ApiErrorCode, err.message);
    }
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred while creating vault.');
  }
}
