import { NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token_hash'),
    code = req.nextUrl.searchParams.get('code'),
    type = req.nextUrl.searchParams.get('type');
  const client = await supabase();
  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL('/app', req.url));
  }
  if (token && ['signup', 'email'].includes(type || '')) {
    const { error } = await client.auth.verifyOtp({
      token_hash: token,
      type: type as EmailOtpType,
    });
    if (!error) return NextResponse.redirect(new URL('/app', req.url));
  }
  return NextResponse.redirect(new URL('/login?error=confirmation', req.url));
}
