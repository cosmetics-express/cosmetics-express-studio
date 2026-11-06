import { notFound } from 'next/navigation';
import { Building2, Users, Sparkles, CalendarDays } from 'lucide-react';
import { requireContext } from '@/lib/auth';
import { localDb } from '@/lib/local-db';
import { refreshLocalCycle } from '@/lib/local-usage';
import { isDemo, supabase } from '@/lib/supabase';
import { PageHeading } from '@/components/ui';
import { AdminTable, type AdminAccount } from '@/components/admin';
export default async function Admin() {
  const ctx = await requireContext();
  if (!ctx.admin) notFound();
  let accounts: AdminAccount[];
  if (isDemo()) {
    const clinics = localDb().prepare('SELECT id FROM clinics').all() as { id: string }[];
    clinics.forEach((c) => refreshLocalCycle(c.id));
    accounts = localDb()
      .prepare(
        `SELECT c.id,c.name,c.suspended,s.plan,s.status,s.used,s.allowance,s.bonus,(SELECT COUNT(*) FROM ai_generations g WHERE g.clinic_id=c.id AND g.status='succeeded' AND g.created_at>=?) AS monthly_generations FROM clinics c JOIN subscriptions s ON s.clinic_id=c.id ORDER BY s.used DESC`,
      )
      .all(
        new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString(),
      ) as unknown as AdminAccount[];
  } else {
    const { data, error } = await (await supabase()).rpc('admin_accounts');
    if (error) throw error;
    accounts = data as AdminAccount[];
  }
  accounts = accounts.map((a) => ({ ...a }));
  const stats = [
    { label: 'קליניקות בפלטפורמה', value: accounts.length, icon: Building2 },
    {
      label: 'מנויים פעילים בתשלום',
      value: accounts.filter((a) => a.status === 'active').length,
      icon: Users,
    },
    {
      label: 'קרדיטים בשימוש במחזורים',
      value: accounts.reduce((s, a) => s + a.used, 0),
      icon: Sparkles,
    },
    {
      label: 'יצירות שהושלמו החודש',
      value: accounts.reduce((s, a) => s + a.monthly_generations, 0),
      icon: CalendarDays,
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="מאחורי היופי"
        title="ניהול הפלטפורמה"
        description="חשבונות, מכסות ויצירת תמונות — מבט על כל הסטודיו."
      />
      <div className="stats-grid">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-top">
              {s.label}
              <s.icon size={20} />
            </div>
            <strong className="stat-number">{s.value}</strong>
          </div>
        ))}
      </div>
      <AdminTable accounts={accounts} />
    </>
  );
}
