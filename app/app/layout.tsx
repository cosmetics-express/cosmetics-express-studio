import { requireContext } from '@/lib/auth';
import { clinic, list } from '@/lib/store';
import { subscription } from '@/lib/usage';
import { isDemo } from '@/lib/supabase';
import { Shell } from '@/components/shell';
import type { Lead } from '@/lib/types';
export const dynamic = 'force-dynamic';
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  const [profile, sub, leads] = await Promise.all([
    clinic(ctx),
    subscription(ctx),
    list<Lead>(ctx, 'leads'),
  ]);
  return (
    <Shell
      clinic={profile}
      subscription={sub}
      admin={ctx.admin}
      demo={isDemo()}
      newLeads={leads.filter((l) => l.status === 'new').length}
    >
      {children}
    </Shell>
  );
}
