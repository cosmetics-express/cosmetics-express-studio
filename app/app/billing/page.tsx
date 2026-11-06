import Link from 'next/link';
import { Sparkles, CalendarDays, Check, ArrowUpLeft, ShieldCheck } from 'lucide-react';
import { requireContext } from '@/lib/auth';
import { subscription } from '@/lib/usage';
import { list } from '@/lib/store';
import { isDemo } from '@/lib/supabase';
import { PageHeading, Pill } from '@/components/ui';
import { formatDate, type Generation } from '@/lib/types';
export default async function Billing() {
  const ctx = await requireContext(),
    sub = await subscription(ctx),
    all = await list<Generation>(ctx, 'ai_generations');
  const total = sub.allowance + sub.bonus,
    remaining = Math.max(0, total - sub.used);
  return (
    <>
      <PageHeading
        eyebrow="מקום ליצירתיות שלך"
        title="החבילה שלי"
        description="כל הקרדיטים והפרטים החשובים, בשקיפות מלאה."
      />
      <div className="billing-grid">
        <section className="panel billing-plan">
          <Pill>גישה מוקדמת · {sub.plan === 'pro' ? 'Pro' : 'Starter'}</Pill>
          <h2>הסטודיו האישי שלך</h2>
          <p>כל מה שצריך כדי ליצור, לפרסם ולהתחבר ללקוחות.</p>
          <div className="billing-allowance">
            <Sparkles size={25} />
            <strong>{sub.allowance}</strong>
            <span>תמונות {isDemo() ? 'הדגמה' : 'AI'} בכל מחזור</span>
          </div>
          <ul>
            {[
              'עריכה חופשית ללא קרדיט נוסף',
              'ייצוא פוסט, סטורי וריבוע',
              'דפי נחיתה וטפסי פנייה',
              'ניהול לידים וייצוא CSV',
            ].map((s) => (
              <li key={s}>
                <Check size={16} />
                {s}
              </li>
            ))}
          </ul>
          <Link href="/pricing" className="button button-outline">
            פרטי החבילות <ArrowUpLeft size={16} />
          </Link>
          <p className="billing-disclosure">
            הסליקה עדיין אינה מחוברת. אין חיובים, חידוש אוטומטי בתשלום או שדרוג פעיל.
          </p>
        </section>
        <div className="form-stack">
          <section className="panel usage-panel">
            <div className="section-heading">
              <h2>היצירתיות שלך החודש</h2>
              <Sparkles size={21} />
            </div>
            <div className="usage-number">
              <strong>{remaining}</strong>
              <span>קרדיטים זמינים מתוך {total}</span>
            </div>
            <div className="progress-track">
              <span style={{ width: `${Math.min(100, (sub.used / total) * 100)}%` }} />
            </div>
            <div className="usage-meta">
              <span>נוצלו {sub.used} קרדיטים</span>
              {sub.bonus > 0 && <span>כולל {sub.bonus} קרדיטי בונוס</span>}
            </div>
            <div className="reset-date">
              <CalendarDays size={20} />
              <span>
                מחזור נוכחי: {formatDate(sub.cycle_start)}–{formatDate(sub.cycle_end)}
                <small>המכסה מתאפסת ב־{formatDate(sub.cycle_end)} · קרדיטים לא נצברים</small>
              </span>
            </div>
            {remaining === 0 && (
              <p className="feedback error">
                המכסה נוצלה. אפשר להמתין למחזור הבא או לפנות למפעילי הפלטפורמה. כל כלי העריכה
                והייצוא נשארים זמינים.
              </p>
            )}
          </section>
          <section className="tip-card">
            <ShieldCheck size={23} />
            <h3>קרדיט אחד, רק כשצריך.</h3>
            <p>
              יצירת תמונה או קונספט ויזואלי חדש משתמשת בקרדיט. טקסט, מחיר, לוגו, פורמט, דף נחיתה
              וייצוא — ללא קרדיט נוסף. אם היצירה נכשלת, הקרדיט משתחרר.
            </p>
          </section>
        </div>
      </div>
      <section className="panel usage-history">
        <h2>היסטוריית יצירת תמונות</h2>
        {all.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>גרסת מנוע</th>
                  <th>מצב</th>
                  <th>קרדיטים</th>
                </tr>
              </thead>
              <tbody>
                {all.slice(0, 50).map((g) => (
                  <tr key={g.id}>
                    <td>{formatDate(g.created_at)}</td>
                    <td>{g.prompt_version}</td>
                    <td>
                      {g.status === 'succeeded'
                        ? 'הושלם'
                        : g.status === 'pending'
                          ? 'בתהליך'
                          : 'נכשל / הקרדיט שוחרר'}
                    </td>
                    <td>{g.credit_consumed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">עדיין לא נוצרו תמונות בחשבון. איורי ההיכרות לא חויבו בקרדיטים.</p>
        )}
      </section>
    </>
  );
}
