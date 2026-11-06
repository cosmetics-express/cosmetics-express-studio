'use client';
import { useState } from 'react';
import {
  Check,
  Phone,
  MessageCircle,
  ArrowUpLeft,
  MapPin,
  Flower2,
  ShieldCheck,
  LoaderCircle,
} from 'lucide-react';
import { Feedback, request } from './forms';
import type { Landing, Campaign, Clinic, Asset } from '@/lib/types';
export function LandingView({
  page,
  clinic,
  campaign,
  asset,
  preview = false,
}: {
  page: Landing;
  clinic: Clinic;
  campaign: Campaign;
  asset: Asset | null | undefined;
  preview?: boolean;
}) {
  const [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const suffix = preview ? '' : `?landing=${encodeURIComponent(page.slug)}`;
  const normalized = clinic.phone.replace(/\D/g, ''),
    whatsapp = normalized.startsWith('0') ? `972${normalized.slice(1)}` : normalized;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (preview) return;
    setBusy(true);
    setError('');
    const f = new FormData(e.currentTarget);
    try {
      await request(`/api/public/${page.slug}/leads`, {
        name: f.get('name'),
        phone: f.get('phone'),
        email: f.get('email'),
        consent: f.get('consent') === 'on',
        website: f.get('website'),
      });
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="landing-site" style={{ '--landing-color': page.color } as React.CSSProperties}>
      <header className="landing-nav">
        <span>
          {clinic.logo_path ? (
            <img src={`/api/assets/logo${suffix}`} alt={clinic.name} />
          ) : (
            <>
              <Flower2 size={24} />
              {clinic.name}
            </>
          )}
        </span>
        <a href={`tel:${normalized}`}>
          <Phone size={15} />
          <b dir="ltr">{clinic.phone}</b>
        </a>
      </header>
      <div className="landing-hero">
        <div className="landing-copy">
          <span className="eyebrow">הזמן שלך להרגיש נפלא</span>
          <h1>{page.headline}</h1>
          <p>{page.subheadline}</p>
          {campaign.price && <strong className="landing-price">{campaign.price}</strong>}
          <a className="button" href="#contact">
            {page.cta}
            <ArrowUpLeft size={17} />
          </a>
          <span className="landing-city">
            <MapPin size={14} />
            {clinic.city}
          </span>
        </div>
        <div className="landing-visual">
          {asset ? (
            <img src={`/api/assets/${asset.id}${suffix}`} alt={`אווירת ${campaign.service}`} />
          ) : (
            <div className="landing-empty-art">
              <Flower2 size={80} />
            </div>
          )}
          {asset?.kind === 'demo' && (
            <small className="landing-demo-note">איור לדוגמה · לא תמונת טיפול</small>
          )}
        </div>
      </div>
      <section className="landing-benefits">
        {page.benefits.map((b, i) => (
          <div key={`${b}-${i}`}>
            <span>
              <Check size={20} />
            </span>
            <h3>{b}</h3>
          </div>
        ))}
      </section>
      <section className="landing-contact" id="contact">
        <div>
          <span className="eyebrow">נעים להכיר</span>
          <h2>
            הצעד הראשון
            <br />
            מתחיל בשיחה.
          </h2>
          <p>{clinic.description || 'אנחנו כאן כדי להקשיב, לייעץ ולהתאים לך את הטיפול הנכון.'}</p>
          <div className="landing-trust">
            <ShieldCheck size={19} />
            <span>
              התאמה אישית בייעוץ מקצועי.
              <br />
              תוצאות הטיפול משתנות מאדם לאדם.
            </span>
          </div>
          <a
            className="whatsapp-link"
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`שלום, אשמח לשמוע עוד על ${campaign.service}`)}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={19} />
            אפשר גם לדבר ב־WhatsApp ↖
          </a>
        </div>
        <div className="landing-form-card">
          {sent ? (
            <div className="thank-you" role="status">
              <span>
                <Check size={30} />
              </span>
              <h2>תודה, הפרטים בדרך אלינו.</h2>
              <p>צוות {clinic.name} ייצור איתך קשר בקרוב.</p>
              <a href={`tel:${normalized}`} className="text-link">
                לשיחה עם הקליניקה <Phone size={15} />
              </a>
            </div>
          ) : (
            <form onSubmit={submit} className="form-stack">
              <h3>{page.cta}</h3>
              <p className="muted">משאירים פרטים, ואנחנו נדאג לכל השאר.</p>
              <label>
                שם מלא
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  placeholder="איך קוראים לך?"
                />
              </label>
              <label>
                מספר טלפון
                <input
                  name="phone"
                  type="tel"
                  required
                  pattern="[+0-9() -]{9,20}"
                  autoComplete="tel"
                  dir="ltr"
                  placeholder="050-0000000"
                />
              </label>
              <label>
                אימייל <small>לא חובה</small>
                <input
                  name="email"
                  type="email"
                  maxLength={254}
                  dir="ltr"
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>
              <div className="honeypot" aria-hidden="true">
                <label>
                  Website
                  <input name="website" autoComplete="off" tabIndex={-1} />
                </label>
              </div>
              <label className="consent-row">
                <input type="checkbox" name="consent" required />
                אני מסכימ/ה לשמירת הפרטים וליצירת קשר בנוגע לטיפול על ידי {clinic.name}.
              </label>
              <small className="muted">
                הפרטים נגישים לצוות הקליניקה לצורך מענה לפנייה. לבקשת עיון או מחיקה אפשר לפנות
                בטלפון {clinic.phone}.
              </small>
              <Feedback error={error} />
              <button className="button" type="submit" disabled={busy || preview}>
                {busy ? <LoaderCircle className="spin" size={17} /> : <ArrowUpLeft size={17} />}{' '}
                {preview ? 'תצוגה מקדימה · הטופס אינו פעיל' : page.cta}
              </button>
            </form>
          )}
        </div>
      </section>
      {page.faq.length > 0 && (
        <section className="landing-faq">
          <span className="eyebrow">כמה דברים שכדאי לדעת</span>
          <h2>שאלות קטנות, תשובות ברורות.</h2>
          {page.faq.map((f, i) => (
            <details key={i}>
              <summary>{f.question}</summary>
              <p>{f.answer}</p>
            </details>
          ))}
        </section>
      )}
      <footer className="landing-footer">
        <span>
          {clinic.name} · {clinic.city}
        </span>
        <span>כל הזכויות שמורות · נוצר ב־Cosmetics Express Studio</span>
      </footer>
    </div>
  );
}
