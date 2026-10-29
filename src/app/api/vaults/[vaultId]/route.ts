// GET /api/vaults/:vaultId - Retrieve vault envelope and operational metadata
// References: docs/06_API_CONTRACT.md, docs/05_BACKEND_SCHEMA.md

import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse } from '@/lib/server/api-response';
import { getAuthenticatedUser } from '@/lib/server/auth';
import { DbError, getVaultById } from '@/lib/server/db';
import type { ApiErrorCode, GetVaultResponse } from '@/types/api';

interface RouteContext {
  params: Promise<{ vaultId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return errorResponse('UNAUTHENTICATED', 'Authentication required.');
    }

    const { vaultId } = await context.params;
    if (!vaultId) {
      return errorResponse('VALIDATION_FAILED', 'Missing vaultId parameter.');
    }

    const { vault, isOwner } = await getVaultById(vaultId, user.id);

    // Response contains ciphertext envelope + operational metadata only
    const responseData: GetVaultResponse = {
      id: vault.id,
      ownerId: vault.owner_id,
      status: vault.status,
      schemaVersion: vault.schema_version,
      cryptoVersion: vault.crypto_version,
      payloadCiphertext: vault.payload_ciphertext,
      payloadNonce: vault.payload_nonce,
      payloadAadVersion: vault.payload_aad_version,
      wrappedDek: isOwner ? vault.wrapped_dek : '', // Nominees do not receive owner KEK-wrapped DEK
      wrapNonce: isOwner ? vault.wrap_nonce : '',
      kdfName: vault.kdf_name,
      kdfParams: vault.kdf_params,
      kdfSalt: isOwner ? vault.kdf_salt : '',
      checkinIntervalSeconds: vault.checkin_interval_seconds,
      lastCheckinAt: vault.last_checkin_at,
      nextCheckinAt: vault.next_checkin_at,
      graceEndsAt: vault.grace_ends_at,
      coolingOffEndsAt: vault.cooling_off_ends_at,
      unlockExpiresAt: vault.unlock_expires_at,
      revision: vault.revision,
      createdAt: vault.created_at,
      updatedAt: vault.updated_at,
    };

    return jsonResponse(responseData);
  } catch (err) {
    if (err instanceof DbError) {
      return errorResponse(err.code as ApiErrorCode, err.message);
    }
    return errorResponse('INTERNAL_ERROR', 'Failed to retrieve vault.');
  }
}
