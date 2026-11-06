'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, ArrowUpLeft, Check, Eye, EyeOff, Sparkles } from 'lucide-react';
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}
export async function request(url: string, body?: unknown, method = 'POST') {
  const res = await fetch(url, {
    method,
    headers: body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => {
    throw new ApiError(
      'לא ניתן לאשר את מצב הבקשה. בדקו את החיבור ונסו שוב; בקשת יצירה חוזרת תשתמש באותו מזהה.',
      0,
    );
  });
  const data = await res.json();
  if (!res.ok) throw new ApiError(data.error || 'הפעולה נכשלה', res.status, data.code);
  return data;
}
export function Feedback({ error, success }: { error?: string; success?: string }) {
  return (
    <div aria-live="polite">
      {error && (
        <p className="feedback error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="feedback success">
          <Check size={16} />
          {success}
        </p>
      )}
    </div>
  );
}
export function Submit({
  busy,
  children,
  disabled = false,
}: {
  busy: boolean;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button className="button" type="submit" disabled={busy || disabled}>
      {busy ? <LoaderCircle size={17} className="spin" /> : <ArrowUpLeft size={17} />} {children}
    </button>
  );
}
export function DemoButton({ label = 'כניסה לסטודיו לדוגמה' }: { label?: string }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const router = useRouter();
  async function enter() {
    setBusy(true);
    setError('');
    try {
      await request('/api/auth/demo');
      router.push('/app');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <button className="button button-outline" disabled={busy} onClick={enter}>
        {busy ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />} {label}
      </button>
      <Feedback error={error} />
    </>
  );
}
export function AuthForm({ signup = false }: { signup?: boolean }) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [show, setShow] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(e.currentTarget);
    try {
      const data = await request(`/api/auth/${signup ? 'signup' : 'login'}`, Object.fromEntries(f));
      if (data.redirect) {
        router.push(data.redirect);
        router.refresh();
      } else setMessage(data.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="form-stack">
      {signup && (
        <label>
          שם הקליניקה
          <input
            name="clinic"
            autoComplete="organization"
            required
            minLength={2}
            maxLength={100}
            placeholder="איך קוראים לקליניקה שלך?"
          />
        </label>
      )}
      <label>
        כתובת אימייל
        <input
          name="email"
          type="email"
          autoComplete="email"
          dir="ltr"
          required
          maxLength={254}
          placeholder="you@clinic.co.il"
        />
      </label>
      <label>
        סיסמה
        <span className="password-wrap">
          <input
            name="password"
            type={show ? 'text' : 'password'}
            dir="ltr"
            autoComplete={signup ? 'new-password' : 'current-password'}
            required
            minLength={8}
            maxLength={128}
            placeholder="לפחות 8 תווים"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? 'הסתרת סיסמה' : 'הצגת סיסמה'}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </span>
      </label>
      <Feedback error={error} success={message} />
      <Submit busy={busy}>{signup ? 'יצירת החשבון שלי' : 'כניסה לסטודיו'}</Submit>
      {signup && (
        <small className="muted">
          המידע שלך נשמר בחשבון הקליניקה שלך. פרטי לידים ייאספו רק בהסכמתם.
        </small>
      )}
    </form>
  );
}
