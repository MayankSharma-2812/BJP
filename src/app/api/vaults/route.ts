// POST /api/vaults - Create a vault envelope
// GET /api/vaults - List user's vaults
// References: docs/06_API_CONTRACT.md, docs/05_BACKEND_SCHEMA.md

import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/server/auth';
import { createVault, getUserVaultsDb, DbError } from '@/lib/server/db';
import { validateCreateVaultRequest, ValidationError } from '@/lib/server/validation';
import type { ApiErrorCode, CreateVaultResponse } from '@/types/api';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse('UNAUTHENTICATED', 'Authentication required.');
    }

    const vaults = await getUserVaultsDb(user.id);
    return jsonResponse({
      vaults: vaults.map((v) => ({
        id: v.id,
        ownerId: v.owner_id,
        status: v.status,
        schemaVersion: v.schema_version,
        cryptoVersion: v.crypto_version,
        checkinIntervalSeconds: v.checkin_interval_seconds,
        lastCheckinAt: v.last_checkin_at,
        nextCheckinAt: v.next_checkin_at,
        graceEndsAt: v.grace_ends_at,
        coolingOffEndsAt: v.cooling_off_ends_at,
        unlockExpiresAt: v.unlock_expires_at,
        revision: v.revision,
        createdAt: v.created_at,
        updatedAt: v.updated_at,
      })),
    });
  } catch (err) {
    if (err instanceof DbError) {
      return errorResponse(err.code as ApiErrorCode, err.message);
    }
    return errorResponse('INTERNAL_ERROR', 'Failed to retrieve vaults.');
  }
}

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
