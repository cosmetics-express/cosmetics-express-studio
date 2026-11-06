import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHash, randomBytes } from 'node:crypto';
import { localDb, seedDemo } from './local-db';
import { isDemo, supabase } from './supabase';
import type { Context } from './types';
export async function context(): Promise<Context | null> {
  if (isDemo()) {
    seedDemo();
    const token = (await cookies()).get('studio_session')?.value;
    if (!token) return null;
    const row = localDb()
      .prepare(
        `SELECT u.id,u.email,u.is_admin,m.clinic_id FROM sessions s JOIN users u ON s.user_id=u.id JOIN memberships m ON m.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?`,
      )
      .get(createHash('sha256').update(token).digest('hex'), new Date().toISOString()) as
      { id: string; email: string; is_admin: number; clinic_id: string } | undefined;
    return row
      ? { userId: row.id, email: row.email, clinicId: row.clinic_id, admin: !!row.is_admin }
      : null;
  }
  const client = await supabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;
  const { data: member } = await client
    .from('memberships')
    .select('clinic_id')
    .eq('user_id', user.id)
    .single();
  if (!member) return null;
  const { data: admin } = await client
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  return { userId: user.id, email: user.email || '', clinicId: member.clinic_id, admin: !!admin };
}
export async function requireContext() {
  const ctx = await context();
  if (!ctx) redirect('/login');
  return ctx;
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 7 * 86400000);
  localDb().prepare('DELETE FROM sessions WHERE expires_at<?').run(new Date().toISOString());
  localDb()
    .prepare('INSERT INTO sessions VALUES(?,?,?)')
    .run(createHash('sha256').update(token).digest('hex'), userId, expires.toISOString());
  (await cookies()).set('studio_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && !isDemo(),
    path: '/',
    expires,
  });
}
export async function logout() {
  if (isDemo()) {
    const jar = await cookies(),
      token = jar.get('studio_session')?.value;
    if (token)
      localDb()
        .prepare('DELETE FROM sessions WHERE token_hash=?')
        .run(createHash('sha256').update(token).digest('hex'));
    jar.delete('studio_session');
  } else {
    const client = await supabase();
    await client.auth.signOut();
  }
}
