import Link from 'next/link';
import { AuthForm, DemoButton } from '@/components/forms';
import { Logo } from '@/components/ui';
import { isDemo } from '@/lib/supabase';
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const p = await searchParams;
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/">
          <Logo />
        </Link>
        <span className="eyebrow">טוב שחזרת</span>
        <h1>הרעיון הבא שלך מחכה.</h1>
        <p>נכנסים לסטודיו וממשיכים ליצור.</p>
        {p.error && (
          <p role="alert" className="feedback error">
            קישור האימות אינו תקין או שפג תוקפו. נסו להתחבר או לבקש קישור חדש דרך ההרשמה.
          </p>
        )}
        <AuthForm />
        {isDemo() && (
          <>
            <div className="divider-text">רק רוצים להכיר?</div>
            <DemoButton />
            <small className="demo-disclosure">סביבת הדגמה מקומית · ללא יצירת תמונות אמיתית</small>
          </>
        )}
        <p className="auth-footer">
          עדיין אין לך חשבון? <Link href="/signup">יוצרים אחד כאן ←</Link>
        </p>
      </div>
      <div className="auth-art">
        <img src="/art/facial.svg" alt="איור אווירת יופי" />
        <span>
          YOUR NEXT
          <br />
          <em>beautiful idea.</em>
        </span>
      </div>
    </div>
  );
}
