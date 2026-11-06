import Link from 'next/link';
import { Check, Sparkles, ArrowUpLeft } from 'lucide-react';
import { PublicNav } from '@/components/public-nav';
export default function Pricing() {
  return (
    <div className="public-page">
      <PublicNav />
      <main className="pricing-page">
        <span className="eyebrow">מקום לגדול, בדרך שלך</span>
        <h1>
          כל מה שהקליניקה שלך צריכה.
          <br />
          <em>בחבילה אחת יפה.</em>
        </h1>
        <p className="muted">בשלב ההרצה אין סליקה ואין חיוב. מחירים מסחריים יפורסמו בהמשך.</p>
        <div className="pricing-grid">
          {[
            { name: 'Starter', desc: 'הצעד הראשון למותג שלך', featured: false },
            { name: 'Pro', desc: 'יותר מקום ליצירתיות שלך', featured: true },
          ].map((plan) => (
            <article className={`pricing-card ${plan.featured ? 'featured' : ''}`} key={plan.name}>
              {plan.featured && (
                <span className="pricing-tag">
                  <Sparkles size={13} />
                  לגדול עם הקליניקה שלך
                </span>
              )}
              <span className="eyebrow" dir="ltr">
                {plan.name}
              </span>
              <h2>{plan.desc}</h2>
              <p className="price-display">
                גישה מוקדמת<span>ללא חיוב בשלב ההרצה</span>
              </p>
              <ul>
                {[
                  '30 יצירות AI בכל מחזור חיוב',
                  'עריכת כותרת, מחיר, טקסט ולוגו ללא קרדיט',
                  'פוסט, סטורי וריבוע מאותה תמונה',
                  'דפי נחיתה וטפסי לידים',
                  'ייצוא PNG / JPG ולידים ל־CSV',
                  ...(plan.featured ? ['מבנה מוכן לשדרוג מכסה בעתיד'] : []),
                ].map((item) => (
                  <li key={item}>
                    <Check size={16} />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className={`button ${!plan.featured ? 'button-outline' : ''}`}>
                פתיחת סטודיו <ArrowUpLeft size={16} />
              </Link>
              <small>שתי החבילות כוללות כרגע מכסה של 30 תמונות. אין שדרוג בתשלום פעיל.</small>
            </article>
          ))}
        </div>
        <p>יצירה שנכשלת אינה מחויבת. יתרה מתאפסת במחזור הבא; קרדיטים לא נצברים.</p>
        <Link href="/" className="text-link">
          בחזרה לבית ←
        </Link>
      </main>
    </div>
  );
}
