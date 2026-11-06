'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toPng, toJpeg } from 'html-to-image';
import {
  Sparkles,
  Download,
  Save,
  Smartphone,
  Square,
  RectangleVertical,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Check,
  ShieldCheck,
  History,
  ArrowRight,
  X,
  Upload,
  LoaderCircle,
} from 'lucide-react';
import { Design } from './design';
import { Feedback, request, ApiError } from './forms';
import { styles, formatDate, type Campaign, type Asset, type Clinic } from '@/lib/types';
export function Editor({
  campaign,
  assets: initialAssets,
  clinic: initialClinic,
  remaining: initialRemaining,
  demo,
  autoGenerate,
  landingId,
}: {
  campaign: Campaign;
  assets: Asset[];
  clinic: Clinic;
  remaining: number;
  demo: boolean;
  autoGenerate: boolean;
  landingId: string;
}) {
  const router = useRouter(),
    [c, setC] = useState(campaign),
    [profile, setProfile] = useState(initialClinic),
    [assets, setAssets] = useState(initialAssets),
    [remaining, setRemaining] = useState(initialRemaining),
    [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [modal, setModal] = useState(autoGenerate && initialRemaining > 0),
    [guides, setGuides] = useState(false),
    [history, setHistory] = useState(false);
  const [concept, setConcept] = useState({
    style: campaign.style,
    direction: campaign.direction,
    notes: campaign.notes,
  });
  const [confirmed, setConfirmed] = useState(false);
  const [exportType, setExportType] = useState('png');
  const canvas = useRef<HTMLDivElement>(null),
    dialog = useRef<HTMLDialogElement>(null);
  const generationKey = useRef<string | null>(null);
  function persistGenerationKey(value: string | null) {
    generationKey.current = value;
    try {
      if (value) sessionStorage.setItem(`studio:generation:${c.id}`, value);
      else sessionStorage.removeItem(`studio:generation:${c.id}`);
    } catch {
      /* Memory retry protection still works if browser storage is unavailable. */
    }
  }
  const active = assets.find((a) => a.id === c.active_asset_id);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  function change<K extends keyof Campaign>(key: K, value: Campaign[K]) {
    setC((v) => ({ ...v, [key]: value }));
    setSuccess('');
  }
  function field(key: 'headline' | 'subheadline' | 'price' | 'cta' | 'phone') {
    return {
      'aria-label': {
        headline: 'כותרת ראשית',
        subheadline: 'כותרת משנית',
        price: 'מחיר',
        cta: 'קריאה לפעולה',
        phone: 'טלפון',
      }[key],
      value: c[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        change(key, e.target.value),
    };
  }
  async function save() {
    await request(`/api/campaigns/${c.id}`, c, 'PATCH');
  }
  async function run(task: string, fn: () => Promise<void>) {
    setBusy(task);
    setError('');
    setSuccess('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  async function generate() {
    if (!confirmed) return;
    await run('generate', async () => {
      if (!generationKey.current) {
        let saved: string | null = null;
        try {
          saved = sessionStorage.getItem(`studio:generation:${c.id}`);
        } catch {
          /* Optional persistence. */
        }
        persistGenerationKey(saved || crypto.randomUUID());
      }
      let result;
      try {
        result = await request(`/api/campaigns/${c.id}/generate`, {
          key: generationKey.current,
          ...concept,
        });
      } catch (error) {
        if (
          error instanceof ApiError &&
          (error.code === 'generation_failed' || error.status === 402)
        )
          persistGenerationKey(null);
        throw error;
      }
      persistGenerationKey(null);
      setAssets((v) => [result.asset, ...v]);
      setC((v) => ({ ...v, active_asset_id: result.asset.id }));
      setModal(false);
      setConfirmed(false);
      const usage = await fetch('/api/usage').then((r) => r.json());
      setRemaining(Math.max(0, usage.allowance + usage.bonus - usage.used));
      setSuccess(
        demo
          ? 'איור ההדגמה מוכן. עודכן קרדיט הדגמה אחד.'
          : 'העיצוב החדש מוכן. עכשיו נותנים לו את המילים שלך.',
      );
      router.refresh();
    });
  }
  async function download() {
    await run('download', async () => {
      if (!canvas.current || !active) throw new Error('יש ליצור תמונה לפני ההורדה');
      await save();
      await document.fonts.ready;
      const options = {
        canvasWidth: 1080,
        canvasHeight: c.format === 'story' ? 1920 : c.format === 'square' ? 1080 : 1350,
        pixelRatio: 1,
        cacheBust: true,
        backgroundColor: c.overlay_color,
        skipAutoScale: true,
      };
      const url =
        exportType === 'png'
          ? await toPng(canvas.current, options)
          : await toJpeg(canvas.current, { ...options, quality: 0.96 });
      const a = document.createElement('a');
      a.href = url;
      a.download = `studio-${c.id}-${c.format}.${exportType === 'png' ? 'png' : 'jpg'}`;
      a.click();
      setSuccess('העיצוב נשמר והקובץ הורד בהצלחה');
    });
  }
  async function logo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await run('logo', async () => {
      const f = new FormData();
      f.set('file', file);
      await request('/api/clinic/logo', f);
      setProfile({ ...profile, logo_path: `updated-${Date.now()}` });
      router.refresh();
      setSuccess('הלוגו עודכן בפרופיל הקליניקה');
    });
  }
  return (
    <>
      <div className="editor-heading">
        <div>
          <Link className="back-link" href={`/app/campaigns/${c.id}`}>
            <ArrowRight size={14} />
            פרטי הקמפיין
          </Link>
          <h1>{c.title}</h1>
          <p>
            <span className="tiny-dot" />
            שינוי טקסט ופורמט — בלי קרדיט נוסף
          </p>
        </div>
        <div className="editor-actions">
          <button
            className="button button-outline"
            disabled={!!busy}
            onClick={() =>
              run('save', async () => {
                await save();
                setSuccess('כל השינויים נשמרו');
                router.refresh();
              })
            }
          >
            {busy === 'save' ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
            שמירת שינויים
          </button>
          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value)}
            aria-label="סוג קובץ להורדה"
          >
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
          </select>
          <button className="button" disabled={!!busy || !active} onClick={download}>
            {busy === 'download' ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Download size={16} />
            )}
            הורדת העיצוב
          </button>
        </div>
      </div>
      <Feedback error={error} success={success} />
      <div className="editor-layout">
        <section className="editor-controls">
          <div className="editor-control-title">
            <span>המילים שלך, העיצוב שלך</span>
            <span className="pill green">עריכה חופשית</span>
          </div>
          <div className="form-stack">
            <label>
              כותרת ראשית
              <textarea {...field('headline')} rows={2} maxLength={140} />
            </label>
            <label>
              כותרת משנית
              <textarea {...field('subheadline')} rows={2} maxLength={250} />
            </label>
            <div className="form-grid">
              <label>
                מחיר
                <input {...field('price')} maxLength={50} />
              </label>
              <label>
                טלפון
                <input {...field('phone')} dir="ltr" maxLength={20} />
              </label>
            </div>
            <label>
              קריאה לפעולה
              <input {...field('cta')} maxLength={60} />
            </label>
          </div>
          <div className="control-section">
            <h3>הטאץ׳ שלך</h3>
            <div className="form-grid">
              <label>
                צבע שכבת הרקע
                <input
                  type="color"
                  value={c.overlay_color}
                  onChange={(e) => change('overlay_color', e.target.value)}
                />
              </label>
              <label>
                צבע הטקסט
                <input
                  type="color"
                  value={c.text_color}
                  onChange={(e) => change('text_color', e.target.value)}
                />
              </label>
            </div>
            <div className="alignment-row">
              <span>יישור טקסט</span>
              <div className="segmented">
                {[
                  ['right', AlignRight],
                  ['center', AlignCenter],
                  ['left', AlignLeft],
                ].map(([value, Icon]) => {
                  const I = Icon as typeof AlignRight;
                  return (
                    <button
                      key={value as string}
                      aria-label={`יישור ${value}`}
                      aria-pressed={c.alignment === value}
                      onClick={() => change('alignment', value as Campaign['alignment'])}
                      className={c.alignment === value ? 'selected' : ''}
                    >
                      <I size={17} />
                    </button>
                  );
                })}
              </div>
            </div>
            <label>
              פריסת טקסט
              <select
                value={c.layout}
                onChange={(e) => change('layout', e.target.value as Campaign['layout'])}
              >
                <option value="bottom">למטה · קלאסי</option>
                <option value="center">במרכז · מודגש</option>
                <option value="top">למעלה · נקי</option>
              </select>
            </label>
            <label>
              מיקום אנכי
              <input
                type="range"
                min="0"
                max="40"
                value={c.text_position}
                onChange={(e) => change('text_position', Number(e.target.value))}
              />
            </label>
            <label className="upload-button">
              <Upload size={16} />
              {busy === 'logo' ? 'מעלים את הלוגו...' : 'העלאת / החלפת לוגו'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={logo}
                disabled={!!busy}
              />
            </label>
            <small className="muted">PNG / JPG / WebP · עד 2MB · נשמר בפרופיל הקליניקה</small>
          </div>
        </section>
        <section className="editor-canvas-area">
          <div className="canvas-toolbar">
            <div className="segmented format-picker">
              {[
                ['post', 'פוסט', RectangleVertical],
                ['story', 'סטורי', Smartphone],
                ['square', 'ריבוע', Square],
              ].map(([value, label, Icon]) => {
                const I = Icon as typeof Square;
                return (
                  <button
                    key={value as string}
                    className={c.format === value ? 'selected' : ''}
                    onClick={() => change('format', value as Campaign['format'])}
                  >
                    <I size={15} />
                    {label as string}
                  </button>
                );
              })}
            </div>
            <label className="guide-toggle">
              <input
                type="checkbox"
                checked={guides}
                onChange={(e) => setGuides(e.target.checked)}
              />
              אזור בטוח
            </label>
          </div>
          <div className={`canvas-wrap canvas-${c.format}`}>
            <div ref={canvas}>
              <Design campaign={c} asset={active} clinic={profile} />
            </div>
            {guides && <div className="safe-guide" aria-hidden="true" />}
          </div>
          <div className="canvas-size">
            {c.format === 'story'
              ? '1080 × 1920'
              : c.format === 'square'
                ? '1080 × 1080'
                : '1080 × 1350'}{' '}
            px <span>·</span> {active?.kind === 'demo' ? 'איור הדגמה' : 'תצוגת העיצוב שלך'}
          </div>
          <div className="canvas-footer">
            <button
              className="button button-outline"
              disabled={!!busy || remaining === 0}
              onClick={() => {
                setConfirmed(false);
                setModal(true);
              }}
            >
              <Sparkles size={16} />
              {active ? 'יצירת קונספט ויזואלי חדש' : 'יצירת העיצוב הראשון'}
              <span className="credit-chip">1 קרדיט</span>
            </button>
            <button className="text-link" onClick={() => setHistory(!history)}>
              <History size={16} />
              גרסאות ({assets.length})
            </button>
          </div>
          {remaining === 0 && (
            <p className="feedback info">
              כל הקרדיטים נוצלו. עריכה והורדת עיצובים קיימים עדיין זמינות.
            </p>
          )}
          {history && (
            <div className="version-history">
              {assets.length ? (
                assets.map((a, i) => (
                  <button
                    key={a.id}
                    className={a.id === c.active_asset_id ? 'selected' : ''}
                    disabled={!!busy}
                    onClick={() =>
                      run('version', async () => {
                        await request(`/api/campaigns/${c.id}/asset`, { assetId: a.id }, 'PATCH');
                        change('active_asset_id', a.id);
                        setSuccess('הגרסה הוחלפה. לא חויב קרדיט.');
                        router.refresh();
                      })
                    }
                  >
                    <img src={`/api/assets/${a.id}`} alt={`גרסה ${assets.length - i}`} />
                    <span>
                      גרסה {assets.length - i}
                      <small>{formatDate(a.created_at)}</small>
                    </span>
                    {a.id === c.active_asset_id && <Check size={15} />}
                  </button>
                ))
              ) : (
                <p className="muted">הגרסאות החדשות יופיעו כאן.</p>
              )}
            </div>
          )}
        </section>
      </div>
      <div className="editor-bottom-note">
        <ShieldCheck size={18} />
        <span>התמונה נשמרת בנפרד מהטקסט. עריכה, החלפת פורמט וייצוא אינם מפעילים יצירת AI.</span>
        <Link href={`/app/campaigns/${c.id}/landing`}>
          ממשיכים לדף הנחיתה <ArrowUpLeftIcon />
        </Link>
      </div>
      <dialog
        ref={dialog}
        className="generation-dialog"
        onCancel={(e) => {
          e.preventDefault();
          if (!busy) setModal(false);
        }}
      >
        <div className="dialog-top">
          <span className="empty-icon">
            <Sparkles size={24} />
          </span>
          <button
            className="icon-button"
            aria-label="סגירה"
            disabled={!!busy}
            onClick={() => setModal(false)}
          >
            <X size={21} />
          </button>
        </div>
        <h2>רוצים עיצוב חדש לגמרי?</h2>
        <p>
          תמונה חדשה, רקע או קונספט חדש משתמשים בקרדיט אחד. לעריכת טקסט בלבד, אפשר לחזור לסטודיו ללא
          עלות.
        </p>
        <div className="form-stack">
          <label>
            אווירה
            <select
              value={concept.style}
              onChange={(e) => setConcept({ ...concept, style: e.target.value })}
            >
              {styles.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            הכיוון החדש
            <textarea
              rows={2}
              value={concept.direction}
              maxLength={500}
              placeholder="רקע, תאורה, קומפוזיציה או אווירה..."
              onChange={(e) => setConcept({ ...concept, direction: e.target.value })}
            />
          </label>
        </div>
        <div className="dialog-credit">
          <Sparkles size={18} />
          <strong>1 קרדיט {demo ? 'הדגמה' : 'יצירה'}</strong>
          <span>מתוך {remaining} זמינים</span>
        </div>
        {demo && (
          <p className="feedback info">
            מצב הדגמה: יתווסף איור לדוגמה. לא נוצרת תמונת AI ולא מתבצעת קריאה ל־OpenAI.
          </p>
        )}
        <label className="consent-row">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          ברור לי שזו יצירה חדשה שתשתמש בקרדיט אחד
        </label>
        {busy === 'generate' && (
          <p className="muted" aria-live="polite">
            יוצרים עבורך... זה יכול לקחת עד כמה דקות. אין צורך ללחוץ שוב.
          </p>
        )}
        <Feedback error={modal ? error : ''} />
        <div className="dialog-actions">
          <button
            className="button"
            disabled={!!busy || !confirmed || remaining < 1}
            onClick={generate}
          >
            {busy === 'generate' ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Sparkles size={17} />
            )}
            כן, יוצרים עיצוב חדש
          </button>
          <button
            className="button button-outline"
            disabled={!!busy}
            onClick={() => setModal(false)}
          >
            רק עריכת העיצוב הקיים
          </button>
        </div>
      </dialog>
    </>
  );
}
function ArrowUpLeftIcon() {
  return <span aria-hidden="true">↖</span>;
}
