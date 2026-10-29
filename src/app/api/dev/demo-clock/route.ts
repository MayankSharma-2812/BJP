import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse } from '@/lib/server/api-response';
import {
  assertDemoModeEnabled,
  executeDemoClockAction,
} from '@/lib/recovery';
import {
  DbError,
  getVaultAdminDb,
  vaultRecordToContext,
  getSupabaseServiceClient,
  getMockDb,
} from '@/lib/server/db';
import { DemoClockRequestSchema, type ApiErrorCode } from '@/types/api';
import type { VaultStatus } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    assertDemoModeEnabled();

    const body = await request.json().catch(() => null);
    const parseResult = DemoClockRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(
        'VALIDATION_FAILED',
        `Invalid demo clock request: ${parseResult.error.issues[0]?.message || 'bad payload'}`
      );
    }

    const { action, seconds, vaultId } = parseResult.data;

    // Retrieve targeted vault
    const vault = await getVaultAdminDb(vaultId);
    const context = vaultRecordToContext(vault);

    const clockResult = executeDemoClockAction(context, action, seconds);

    // Persist updated context in DB
    const client = getSupabaseServiceClient();
    if (client) {
      await client
        .from('vaults')
        .update({
          status: clockResult.updatedContext.status,
          next_checkin_at: clockResult.updatedContext.nextCheckInAt,
          grace_ends_at: clockResult.updatedContext.graceEndsAt,
          cooling_off_ends_at: clockResult.updatedContext.coolingOffEndsAt,
          unlock_expires_at: clockResult.updatedContext.unlockExpiresAt,
          updated_at: clockResult.simulatedTime,
        })
        .eq('id', vaultId);
    } else {
      const mock = getMockDb();
      const existing = mock.vaults.get(vaultId);
      if (existing) {
        mock.vaults.set(vaultId, {
          ...existing,
          status: clockResult.updatedContext.status as VaultStatus,
          next_checkin_at: clockResult.updatedContext.nextCheckInAt,
          grace_ends_at: clockResult.updatedContext.graceEndsAt,
          cooling_off_ends_at: clockResult.updatedContext.coolingOffEndsAt,
          unlock_expires_at: clockResult.updatedContext.unlockExpiresAt,
          updated_at: clockResult.simulatedTime,
        });
      }
    }

    return jsonResponse({
      success: true,
      simulatedTime: clockResult.simulatedTime,
      vaultStatus: clockResult.updatedContext.status,
      nextCheckInAt: clockResult.updatedContext.nextCheckInAt,
      coolingOffEndsAt: clockResult.updatedContext.coolingOffEndsAt,
      notes: clockResult.notes,
    });
  } catch (err: unknown) {
    if (err instanceof DbError) {
      return errorResponse(err.code as ApiErrorCode, err.message);
    }
    const msg = err instanceof Error ? err.message : 'Failed to execute demo clock action.';
    if (msg.includes('FORBIDDEN')) {
      return errorResponse('FORBIDDEN', msg);
    }
    return errorResponse('INTERNAL_ERROR', msg);
  }
}
