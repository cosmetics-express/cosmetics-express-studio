'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Sparkles, PenLine, Check, Flower2 } from 'lucide-react';
import { Feedback, Submit, request } from './forms';
import { services, styles } from '@/lib/types';
export function Wizard({ remaining, demo }: { remaining: number; demo: boolean }) {
  const [step, setStep] = useState(1),
    [mode, setMode] = useState('new'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const router = useRouter();
  const [values, setValues] = useState({
    title: '',
    service: services[0],
    objective: 'לידים חדשים',
    price: '',
    second_offer: '',
    style: styles[0],
    audience: 'נשים וגברים בגילאי 25–55',
    notes: '',
    direction: '',
  });
  function field(key: keyof typeof values) {
    return {
      value: values[key],
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
      ) => setValues({ ...values, [key]: e.target.value }),
    };
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    if (mode === 'existing') {
      router.push('/app/campaigns');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { id } = await request('/api/campaigns', values);
      router.push(`/app/campaigns/${id}/editor?generate=1`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="wizard-layout">
      <div className="wizard-main">
        <div className="wizard-steps">
          {['פרטי הקמפיין', 'הכיוון העיצובי', 'בוחרים איך ליצור'].map((s, i) => (
            <button
              key={s}
              disabled={i + 1 > step}
              className={step === i + 1 ? 'current' : step > i + 1 ? 'done' : ''}
              onClick={() => setStep(i + 1)}
            >
              <span>{step > i + 1 ? <Check size={15} /> : i + 1}</span>
              {s}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="panel wizard-form">
          {step === 1 && (
            <>
              <span className="eyebrow">01 / מתחילים ברעיון</span>
              <h2>מה מקדמים היום?</h2>
              <p className="muted">קצת פרטים, כדי שהקמפיין ירגיש בדיוק שלך.</p>
              <div className="form-grid">
                <label className="full-width">
                  שם הקמפיין / כותרת המבצע
                  <input
                    {...field('title')}
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="למשל: קיץ חלק מתחיל כאן"
                  />
                </label>
                <label>
                  סוג הטיפול
                  <select {...field('service')}>
                    {services.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  מטרת הקמפיין
                  <select {...field('objective')}>
                    {['לידים חדשים', 'קביעת פגישות', 'חשיפה למותג'].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  מחיר / הצעה
                  <input {...field('price')} maxLength={50} placeholder="למשל: החל מ־199 ₪" />
                </label>
                <label>
                  הצעה נוספת <small>לא חובה</small>
                  <input
                    {...field('second_offer')}
                    maxLength={150}
                    placeholder="למשל: פגישת ייעוץ ללא עלות"
                  />
                </label>
                <label className="full-width">
                  למי הקמפיין מיועד?
                  <input {...field('audience')} required minLength={2} maxLength={200} />
                </label>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <span className="eyebrow">02 / נותנים לרעיון אופי</span>
              <h2>איך זה מרגיש?</h2>
              <p className="muted">ה־AI יעצב את האווירה. את המילים נוסיף בנפרד.</p>
              <div className="style-choices">
                {styles.map((s, i) => (
                  <button
                    type="button"
                    aria-pressed={values.style === s}
                    key={s}
                    className={`style-choice style-${i} ${values.style === s ? 'selected' : ''}`}
                    onClick={() => setValues({ ...values, style: s })}
                  >
                    <span>
                      <Flower2 size={27} />
                    </span>
                    {s}
                    {values.style === s && <Check size={14} />}
                  </button>
                ))}
              </div>
              <div className="form-stack">
                <label>
                  כיוון ויזואלי
                  <textarea
                    {...field('direction')}
                    maxLength={500}
                    rows={3}
                    placeholder="למשל: תאורה טבעית, גווני שמנת ומרווה, אווירה רגועה ונקייה"
                  />
                </label>
                <label>
                  הערות למעצב ה־AI <small>לא חובה</small>
                  <textarea
                    {...field('notes')}
                    maxLength={1000}
                    rows={2}
                    placeholder="פרטים ויזואליים נוספים שחשובים לך"
                  />
                </label>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <span className="eyebrow">03 / שומרים על הקרדיטים שלך</span>
              <h2>עיצוב חדש, או רענון קטן?</h2>
              <p className="muted">בוחרים במפורש. יצירת תמונה תתבצע רק לאחר אישור נוסף בסטודיו.</p>
              <div className="generation-choices">
                <button
                  type="button"
                  aria-pressed={mode === 'new'}
                  onClick={() => setMode('new')}
                  className={mode === 'new' ? 'selected' : ''}
                >
                  <Sparkles size={24} />
                  <strong>רוצים עיצוב חדש לגמרי?</strong>
                  <span>יצירת קונספט ויזואלי חדש עם AI</span>
                  <b>1 קרדיט {demo ? 'הדגמה' : 'יצירה'}</b>
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'existing'}
                  onClick={() => setMode('existing')}
                  className={mode === 'existing' ? 'selected' : ''}
                >
                  <PenLine size={24} />
                  <strong>רוצים לערוך עיצוב קיים?</strong>
                  <span>טקסט, מחיר, לוגו, מיקום ופורמט</span>
                  <b>ללא קרדיט נוסף</b>
                </button>
              </div>
              {remaining === 0 && mode === 'new' && (
                <p className="feedback error">
                  הקרדיטים למחזור זה נוצלו. אפשר ליצור טיוטה ולערוך עיצובים קיימים.
                </p>
              )}
              {demo && (
                <p className="feedback info">
                  הדגמה: הסטודיו ישתמש באיור לדוגמה, ויעדכן רק את מונה קרדיטי ההדגמה. אין פנייה
                  ל־OpenAI.
                </p>
              )}
              <div className="wizard-summary">
                <strong>{values.title}</strong>
                <span>
                  {values.service} · {values.style} · {values.price || 'ללא מחיר'}
                </span>
              </div>
            </>
          )}
          <Feedback error={error} />
          <div className="form-actions">
            {step > 1 ? (
              <button
                type="button"
                className="button button-outline"
                onClick={() => setStep(step - 1)}
              >
                <ArrowRight size={16} />
                חזרה
              </button>
            ) : (
              <Link href="/app/campaigns" className="text-link">
                ביטול
              </Link>
            )}
            <Submit busy={busy}>
              {step < 3
                ? 'ממשיכים לכיוון העיצובי'
                : mode === 'existing'
                  ? 'לבחירת עיצוב קיים'
                  : 'יצירת טיוטה ומעבר לסטודיו'}
            </Submit>
          </div>
        </form>
      </div>
      <aside className="wizard-aside">
        <span className="tip-icon">
          <Sparkles size={24} />
        </span>
        <h3>
          נוצר בשבילך.
          <br />
          נשאר בשליטה שלך.
        </h3>
        <p>התמונה נוצרת בנפרד מהטקסט. כך אפשר לשנות את המסר, בלי ליצור הכול מחדש.</p>
        <div className="aside-credit">
          <strong>{remaining}</strong>
          <span>קרדיטים זמינים במחזור הנוכחי</span>
        </div>
        <ul>
          <li>
            <Check size={15} />
            עיצוב AI מקורי לקליניקה
          </li>
          <li>
            <Check size={15} />
            שליטה מלאה בטקסט בעברית
          </li>
          <li>
            <Check size={15} />
            תמונה אחת, שלושה פורמטים
          </li>
        </ul>
      </aside>
    </div>
  );
}
