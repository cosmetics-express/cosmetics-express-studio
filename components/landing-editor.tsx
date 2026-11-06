'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save,
  ExternalLink,
  Copy,
  Eye,
  PenLine,
  Plus,
  Trash2,
  Globe,
  LoaderCircle,
} from 'lucide-react';
import { LandingView } from './landing';
import { Feedback, request } from './forms';
import type { Landing, Campaign, Asset, Clinic } from '@/lib/types';
export function LandingEditor({
  page,
  clinic,
  campaign,
  asset,
}: {
  page: Landing;
  clinic: Clinic;
  campaign: Campaign;
  asset: Asset | null;
}) {
  const [p, setP] = useState(page),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [preview, setPreview] = useState(false);
  const router = useRouter();
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await request(`/api/landing/${p.id}`, { ...p, published: !!p.published }, 'PATCH');
      setSuccess(p.published ? 'דף הנחיתה נשמר ופורסם' : 'הטיוטה נשמרה. הדף אינו פתוח לציבור.');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/p/${p.slug}`);
      setSuccess('הקישור הועתק');
    } catch {
      setError('לא ניתן להעתיק. אפשר להעתיק את הקישור משורת הכתובת לאחר פתיחת הדף.');
    }
  }
  return (
    <>
      <div className="landing-editor-actions">
        <button className="button button-outline" onClick={() => setPreview(!preview)}>
          {preview ? <PenLine size={16} /> : <Eye size={16} />}{' '}
          {preview ? 'חזרה לעריכה' : 'תצוגה מקדימה'}
        </button>
        {!!page.published && (
          <>
            <a
              className="button button-outline"
              href={`/p/${p.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={16} />
              פתיחת הדף
            </a>
            <button className="button button-outline" onClick={copy}>
              <Copy size={16} />
              העתקת קישור
            </button>
          </>
        )}
      </div>
      <Feedback error={error} success={success} />
      {preview ? (
        <div className="landing-preview">
          <LandingView page={p} clinic={clinic} campaign={campaign} asset={asset} preview />
        </div>
      ) : (
        <form onSubmit={save} className="landing-edit-grid">
          <section className="panel form-stack">
            <span className="eyebrow">הסיפור של הקמפיין</span>
            <h2>כל המילים הנכונות</h2>
            <label>
              כותרת ראשית
              <input
                value={p.headline}
                required
                maxLength={140}
                onChange={(e) => setP({ ...p, headline: e.target.value })}
              />
            </label>
            <label>
              כותרת משנה
              <textarea
                value={p.subheadline}
                maxLength={500}
                rows={3}
                onChange={(e) => setP({ ...p, subheadline: e.target.value })}
              />
            </label>
            <label>
              יתרונות <small>יתרון אחד בכל שורה, עד 6</small>
              <textarea
                value={p.benefits.join('\n')}
                rows={5}
                onChange={(e) => setP({ ...p, benefits: e.target.value.split('\n') })}
              />
            </label>
            <label>
              טקסט כפתור הפעולה
              <input
                value={p.cta}
                required
                maxLength={60}
                onChange={(e) => setP({ ...p, cta: e.target.value })}
              />
            </label>
            <label>
              צבע המותג בדף
              <input
                type="color"
                value={p.color}
                onChange={(e) => setP({ ...p, color: e.target.value })}
              />
            </label>
          </section>
          <div className="form-stack">
            <section className="panel form-stack">
              <h2>שאלות ותשובות</h2>
              {p.faq.map((f, i) => (
                <div key={i} className="faq-edit">
                  <div>
                    <label>
                      שאלה {i + 1}
                      <input
                        required
                        maxLength={180}
                        value={f.question}
                        onChange={(e) =>
                          setP({
                            ...p,
                            faq: p.faq.map((x, j) =>
                              i === j ? { ...x, question: e.target.value } : x,
                            ),
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`מחיקת שאלה ${i + 1}`}
                      onClick={() => setP({ ...p, faq: p.faq.filter((_, j) => i !== j) })}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <label>
                    תשובה
                    <textarea
                      required
                      maxLength={600}
                      rows={2}
                      value={f.answer}
                      onChange={(e) =>
                        setP({
                          ...p,
                          faq: p.faq.map((x, j) =>
                            i === j ? { ...x, answer: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                </div>
              ))}
              <button
                type="button"
                className="button button-outline"
                disabled={p.faq.length >= 6}
                onClick={() => setP({ ...p, faq: [...p.faq, { question: '', answer: '' }] })}
              >
                <Plus size={16} />
                הוספת שאלה
              </button>
            </section>
            <section className="panel publish-panel">
              <Globe size={24} />
              <h2>מוכנים לקבל פניות?</h2>
              <p className="muted">
                פרסום הדף יפתח קישור ציבורי עם טופס פנייה. כיבוי הפרסום מסתיר גם את הדף וגם את
                הטופס.
              </p>
              <label className="consent-row">
                <input
                  type="checkbox"
                  checked={!!p.published}
                  onChange={(e) => setP({ ...p, published: e.target.checked })}
                />
                דף הנחיתה מפורסם ופתוח לציבור
              </label>
              <button className="button" type="submit" disabled={busy}>
                {busy ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}שמירת דף
                הנחיתה
              </button>
              <small>פרסום ועריכת דף נחיתה לא משתמשים בקרדיטי תמונה.</small>
            </section>
          </div>
        </form>
      )}
    </>
  );
}
