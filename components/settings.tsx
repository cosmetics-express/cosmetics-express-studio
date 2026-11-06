'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Trash2, Flower2, Check } from 'lucide-react';
import { Feedback, Submit, request } from './forms';
import type { Clinic } from '@/lib/types';
export function ClinicSettings({ clinic, email }: { clinic: Clinic; email: string }) {
  const [c, setC] = useState(clinic),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [logoVersion, setLogoVersion] = useState('');
  const router = useRouter();
  function field(key: 'name' | 'phone' | 'city' | 'description') {
    return {
      value: c[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setC({ ...c, [key]: e.target.value }),
    };
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await request('/api/clinic', c, 'PATCH');
      setSuccess('פרופיל הקליניקה נשמר. קמפיינים חדשים ישתמשו בפרטים האלו.');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const f = new FormData();
      f.set('file', file);
      await request('/api/clinic/logo', f);
      setC({ ...c, logo_path: 'updated' });
      setLogoVersion(`?v=${Date.now()}`);
      setSuccess('הלוגו נשמר');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function removeLogo() {
    setBusy(true);
    setError('');
    try {
      await request('/api/clinic/logo', undefined, 'DELETE');
      setC({ ...c, logo_path: null });
      setSuccess('הלוגו הוסר מהקליניקה');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="settings-grid">
      <form onSubmit={save} className="panel form-stack">
        <span className="eyebrow">נעים להכיר את הקליניקה שלך</span>
        <h2>הפרטים הקטנים, המותג הגדול</h2>
        <label>
          שם הקליניקה
          <input
            {...field('name')}
            required
            minLength={2}
            maxLength={100}
            autoComplete="organization"
          />
        </label>
        <div className="form-grid">
          <label>
            טלפון
            <input {...field('phone')} dir="ltr" type="tel" required />
          </label>
          <label>
            עיר
            <input {...field('city')} required minLength={2} maxLength={80} />
          </label>
        </div>
        <label>
          על הקליניקה <small>לא חובה</small>
          <textarea
            {...field('description')}
            rows={4}
            maxLength={1000}
            placeholder="ספרו קצת על מה שמיוחד אצלכם"
          />
        </label>
        <label>
          צבע המותג
          <div className="brand-color-input">
            <input
              type="color"
              value={c.color}
              onChange={(e) => setC({ ...c, color: e.target.value })}
            />
            <span dir="ltr">{c.color}</span>
          </div>
        </label>
        <Feedback error={error} success={success} />
        <div>
          <Submit busy={busy}>שמירת פרופיל הקליניקה</Submit>
        </div>
      </form>
      <div className="form-stack">
        <section className="panel logo-panel">
          <h2>החתימה שלך</h2>
          <div className="logo-preview">
            {c.logo_path ? (
              <img src={`/api/assets/logo${logoVersion}`} alt="לוגו הקליניקה" />
            ) : (
              <Flower2 size={55} strokeWidth={1} />
            )}
          </div>
          <label className="upload-button">
            <Upload size={17} />
            בחירת לוגו
            <input
              type="file"
              disabled={busy}
              accept="image/png,image/jpeg,image/webp"
              onChange={upload}
            />
          </label>
          {c.logo_path && (
            <button className="text-link" disabled={busy} onClick={removeLogo}>
              <Trash2 size={14} />
              הסרת הלוגו
            </button>
          )}
          <small className="muted">PNG / JPG / WebP עד 2MB. מומלץ PNG עם רקע שקוף.</small>
        </section>
        <section className="panel account-panel">
          <span className="eyebrow">פרטי החשבון</span>
          <p dir="ltr">{email}</p>
          <p className="muted">
            <Check size={15} /> הנתונים שלך מופרדים מחשבונות אחרים.
          </p>
          <small className="muted">
            עדכון פרופיל משפיע על קמפיינים חדשים. את הטקסט והטלפון בעיצובים קיימים אפשר לשנות
            בסטודיו.
          </small>
        </section>
      </div>
    </div>
  );
}
