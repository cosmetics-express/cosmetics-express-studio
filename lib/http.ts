import 'server-only';
import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { DomainError } from './local-usage';
import { isDemo, serviceClient } from './supabase';
import { localRateLimit } from './local-db';
export function protectOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (origin !== new URL(process.env.APP_URL || req.url).origin)
    throw new DomainError('הבקשה לא אושרה. רעננו את הדף ונסו שוב.', 403);
}
export async function jsonBody(req: NextRequest) {
  if (Number(req.headers.get('content-length') || 0) > 32768)
    throw new DomainError('הבקשה גדולה מדי', 413);
  const text = await req.text();
  if (text.length > 32768) throw new DomainError('הבקשה גדולה מדי', 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new DomainError('בקשה לא תקינה');
  }
}
export async function rateLimit(req: NextRequest, scope: string, limit: number, windowMs: number) {
  // Configure the deployment proxy to overwrite x-forwarded-for; never expose the server directly.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const key = createHash('sha256').update(`${scope}:${ip}`).digest('hex');
  let allowed: boolean;
  if (isDemo()) allowed = localRateLimit(key, limit, windowMs);
  else {
    const { data, error } = await serviceClient().rpc('check_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window: Math.ceil(windowMs / 1000),
    });
    if (error) throw new DomainError('השירות לא זמין כרגע', 503);
    allowed = !!data;
  }
  if (!allowed) throw new DomainError('יותר מדי ניסיונות. נסו שוב בעוד מספר דקות.', 429);
}
export function failure(error: unknown) {
  if (error instanceof DomainError)
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: 'יש לבדוק את השדות ולנסות שוב', fields: error.flatten().fieldErrors },
      { status: 422 },
    );
  console.error('Request failed', { type: error instanceof Error ? error.name : 'Error' });
  return NextResponse.json({ error: 'משהו השתבש. נסו שוב בעוד רגע.' }, { status: 500 });
}
