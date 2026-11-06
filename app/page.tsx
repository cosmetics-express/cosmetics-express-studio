import Link from 'next/link';
import {
  ArrowUpLeft,
  Sparkles,
  Check,
  MousePointer2,
  Layers,
  Heart,
  ArrowLeft,
} from 'lucide-react';
import { PublicNav } from '@/components/public-nav';
import { Logo } from '@/components/ui';
import { DemoButton } from '@/components/forms';
import { isDemo } from '@/lib/supabase';
export default function Home() {
  return (
    <div className="public-page">
      <PublicNav />
      <main>
        <section className="marketing-hero">
          <div className="marketing-copy">
            <span className="eyebrow">
              <span className="tiny-dot" /> הסטודיו החדש של קליניקות היופי
            </span>
            <h1>
              היופי שלך.
              <br />
              הסיפור שלך.
              <br />
              <em>הסטודיו שלך.</em>
            </h1>
            <p>
              הופכים את מה שמיוחד בקליניקה שלך לקמפיינים שאי אפשר להתעלם מהם. עיצוב מקורי עם AI,
              מילים שלך, ותוצאות שמתחילות בקליק.
            </p>
            <div className="hero-buttons">
              <Link href="/signup" className="button">
                בואו ניצור משהו יפה <ArrowUpLeft size={18} />
              </Link>
              {isDemo() && <DemoButton label="לסיור בסטודיו" />}
            </div>
            <div className="marketing-proof">
              <span>✳</span>בלי ידע בעיצוב <i />
              בלי חיבור לרשתות חברתיות <i />
              בעברית מלאה
            </div>
          </div>
          <div className="marketing-gallery">
            <div className="marketing-halo" />
            <div className="marketing-design design-one">
              <img src="/art/laser.svg" alt="איור הדגמה לעיצוב קמפיין יופי" />
              <div>
                <small>BEAUTY BEGINS WITH YOU</small>
                <h2>
                  קיץ חלק
                  <br />
                  מתחיל כאן.
                </h2>
                <p>הרגע שלך להרגיש נפלא</p>
                <span>קליניקת נועה ↖</span>
              </div>
            </div>
            <div className="marketing-design design-two">
              <img src="/art/facial.svg" alt="איור הדגמה לקמפיין טיפולי פנים" />
              <div>
                <small>YOUR SKIN, REIMAGINED</small>
                <h2>
                  זמן
                  <br />
                  לזהור.
                </h2>
              </div>
            </div>
            <div className="marketing-floating">
              <Sparkles size={22} />
              <span>
                הרעיון שלך, בגרסה היפה שלו.<small>עיצוב AI מקורי. עריכה חופשית.</small>
              </span>
            </div>
            <span className="sample-note">המחשה עיצובית · איורים לדוגמה</span>
          </div>
        </section>
        <section id="how" className="marketing-how">
          <span className="eyebrow">פחות מאמץ. יותר יופי.</span>
          <h2>מהרעיון שלך, עד ללקוח הבא.</h2>
          <div className="feature-grid">
            {[
              {
                icon: Sparkles,
                n: '01',
                title: 'נותנים לרעיון צורה',
                text: 'בוחרים טיפול וכיוון עיצובי. ה־AI יוצר תמונה מקורית שמרגישה בדיוק כמו המותג שלך.',
              },
              {
                icon: Layers,
                n: '02',
                title: 'עושים את זה שלך',
                text: 'מוסיפים כותרת, מחיר ולוגו בעברית. פוסט, סטורי או ריבוע — מאותה תמונה, ללא קרדיט נוסף.',
              },
              {
                icon: MousePointer2,
                n: '03',
                title: 'פותחים דלת ללקוחות',
                text: 'מפרסמים דף נחיתה עם טופס פנייה, ומנהלים את כל הלידים במקום אחד.',
              },
            ].map((f) => (
              <article key={f.n}>
                <div>
                  <f.icon size={24} />
                  <span>{f.n}</span>
                </div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="marketing-cta">
          <Heart size={29} />
          <h2>הקליניקה שלך ראויה להיראות ככה.</h2>
          <p>30 יצירות AI במחזור. אינסוף דרכים להפוך כל אחת לשלך.</p>
          <Link href="/pricing" className="button button-cream">
            מוצאים את החבילה שלך <ArrowLeft size={17} />
          </Link>
        </section>
      </main>
      <footer className="public-footer">
        <Logo />
        <span>נוצר בשביל היופי שלך. © {new Date().getFullYear()}</span>
        <Link href="/pricing">חבילות ותנאים</Link>
      </footer>
    </div>
  );
}
