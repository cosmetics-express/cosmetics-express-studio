import { NextResponse } from 'next/server';
import { isDemo } from '@/lib/supabase';
import { localDb } from '@/lib/local-db';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (isDemo()) localDb().prepare('SELECT 1').get();
  return NextResponse.json(
    { ok: true, mode: isDemo() ? 'demo' : 'production' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
