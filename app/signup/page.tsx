import Link from 'next/link';
import { AuthForm } from '@/components/forms';
import { Logo } from '@/components/ui';
import { isDemo } from '@/lib/supabase';
export default function Signup() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/">
          <Logo />
        </Link>
        <span className="eyebrow">ברוכים הבאים לסטודיו שלך</span>
        <h1>מקליניקה. למותג.</h1>
        <p>יוצרים חשבון, מוסיפים את הקליניקה, ונותנים ליופי מקום.</p>
        {isDemo() && (
          <p className="feedback info">
            מצב הדגמה: החשבון יישמר במחשב המקומי בלבד. אין חיוב או שליחת אימייל.
          </p>
        )}
        <AuthForm signup />
        <p className="auth-footer">
          כבר חלק מהסטודיו? <Link href="/login">כניסה לחשבון ←</Link>
        </p>
      </div>
      <div className="auth-art">
        <img src="/art/skin.svg" alt="איור אווירת טיפוח" />
        <span>
          MAKE ROOM
          <br />
          <em>for your beauty.</em>
        </span>
      </div>
    </div>
  );
}
