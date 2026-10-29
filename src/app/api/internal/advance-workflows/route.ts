import { NextRequest } from 'next/server';
import { errorResponse, jsonResponse } from '@/lib/server/api-response';
import { advanceWorkflowsDb } from '@/lib/server/db';

export async function POST(request: NextRequest) {
  try {
    const schedulerSecret = process.env.DEMO_CLOCK_SECRET || 'internal-scheduler-secret';
    const providedSecret = request.headers.get('x-scheduler-secret') ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    // Allow in test environment or with matching secret
    if (process.env.NODE_ENV !== 'test' && providedSecret !== schedulerSecret) {
      return errorResponse('FORBIDDEN', 'Unauthorized scheduler execution.');
    }

    const result = await advanceWorkflowsDb();
    return jsonResponse(result);
  } catch {
    return errorResponse('INTERNAL_ERROR', 'Failed to advance workflow states.');
  }
}
