'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pause, Play, ShieldCheck } from 'lucide-react';
import { request, Feedback } from './forms';
import { Pill } from './ui';
export type AdminAccount = {
  id: string;
  name: string;
  plan: string;
  status: string;
  used: number;
  allowance: number;
  bonus: number;
  suspended: number | boolean;
  monthly_generations: number;
};
export function AdminTable({ accounts }: { accounts: AdminAccount[] }) {
  const [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [credits, setCredits] = useState<Record<string, number>>({});
  const router = useRouter();
  async function act(id: string, values: Record<string, unknown>) {
    setBusy(id);
    setError('');
    setSuccess('');
    try {
      await request('/api/admin', { clinicId: id, ...values });
      setSuccess(values.credits ? 'קרדיטי הבונוס נוספו למחזור הנוכחי' : 'מצב החשבון עודכן');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>קליניקות ושימוש</h2>
        <Pill>גישה מוגבלת למנהלים</Pill>
      </div>
      <Feedback error={error} success={success} />
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>קליניקה</th>
              <th>חבילה / מצב</th>
              <th>שימוש במחזור</th>
              <th>יצירות החודש</th>
              <th>תוספת קרדיטים</th>
              <th>גישה ליצירה</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.name}</strong>
                  <small className="admin-id" dir="ltr">
                    {a.id.slice(0, 8)}
                  </small>
                </td>
                <td>
                  {a.plan} / {a.status}
                </td>
                <td>
                  {a.used} / {a.allowance + a.bonus}
                </td>
                <td>{a.monthly_generations}</td>
                <td>
                  <div className="inline-actions">
                    <input
                      type="number"
                      className="credit-input"
                      aria-label={`קרדיטים עבור ${a.name}`}
                      min={1}
                      max={1000}
                      value={credits[a.id] ?? 5}
                      onChange={(e) => setCredits({ ...credits, [a.id]: Number(e.target.value) })}
                    />
                    <button
                      className="button button-small button-outline"
                      disabled={
                        !!busy ||
                        !Number.isInteger(credits[a.id] ?? 5) ||
                        (credits[a.id] ?? 5) < 1 ||
                        (credits[a.id] ?? 5) > 1000
                      }
                      onClick={() => act(a.id, { credits: credits[a.id] ?? 5 })}
                    >
                      <Plus size={14} />
                      הענקה
                    </button>
                  </div>
                </td>
                <td>
                  <button
                    className={`button button-small ${a.suspended ? '' : 'button-outline'}`}
                    disabled={!!busy}
                    onClick={() => act(a.id, { suspended: !a.suspended })}
                  >
                    {a.suspended ? <Play size={14} /> : <Pause size={14} />}{' '}
                    {a.suspended ? 'חידוש חשבון' : 'השהיית חשבון'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted admin-note">
        <ShieldCheck size={15} />
        השהיה חוסמת יצירת תמונות ודפי נחיתה ציבוריים. קרדיטי בונוס תקפים למחזור הנוכחי. פעולות הענקה
        מתועדות ביומן השימוש.
      </p>
    </section>
  );
}
