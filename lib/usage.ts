import 'server-only';
import { isDemo, supabase } from './supabase';
import { refreshLocalCycle, DomainError } from './local-usage';
import type { Context, Subscription } from './types';
export async function subscription(ctx: Context): Promise<Subscription> {
  if (isDemo()) return refreshLocalCycle(ctx.clinicId);
  const client = await supabase();
  const { error } = await client.rpc('refresh_cycle');
  if (error) throw new DomainError('לא ניתן לטעון את נתוני המנוי', 503);
  const { data, error: readError } = await client
    .from('subscriptions')
    .select('*')
    .eq('clinic_id', ctx.clinicId)
    .single();
  if (readError) throw readError;
  return data as Subscription;
}
