import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'last-mile-vault',
    timestamp: new Date().toISOString(),
  });
}
