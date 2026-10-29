// Server authentication helper
// References: docs/03_TRD.md, docs/06_API_CONTRACT.md

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role: 'authenticated';
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  // Support test / mock header in demo or test environments
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.NODE_ENV === 'test';
  const testUserId = request.headers.get('x-test-user-id');
  if (isDemo && testUserId) {
    return {
      id: testUserId,
      email: `${testUserId}@example.test`,
      role: 'authenticated',
    };
  }

  const authHeader = request.headers.get('authorization');
  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    // Check cookies for Supabase auth token
    const cookieToken = request.cookies.get('sb-access-token')?.value;
    if (cookieToken) {
      token = cookieToken;
    }
  }

  if (!token) {
    return null;
  }

  // If Supabase credentials are configured, verify the token cryptographically
  if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('example.supabase.co')) {
    try {
      const client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
      });
      const { data: { user }, error } = await client.auth.getUser(token);
      if (error || !user) {
        return null;
      }
      return {
        id: user.id,
        email: user.email,
        role: 'authenticated',
      };
    } catch {
      return null;
    }
  }

  // Fallback for mocked bearer tokens in demo/local mode
  if (isDemo && token.startsWith('mock-token-')) {
    const mockId = token.replace('mock-token-', '');
    return {
      id: mockId,
      email: `${mockId}@example.test`,
      role: 'authenticated',
    };
  }

  return null;
}
