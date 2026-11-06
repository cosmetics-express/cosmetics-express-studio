'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="standalone-message">
      <span>✳</span>
      <h1>נתקלנו במשהו לא צפוי.</h1>
      <p>אפשר לנסות שוב בעוד רגע. אם הבעיה נמשכת, פנו למפעילי הסטודיו.</p>
      <button className="button" onClick={reset}>
        ננסה שוב
      </button>
      <Link className="text-link" href="/">
        בחזרה לבית ←
      </Link>
    </main>
  );
}
