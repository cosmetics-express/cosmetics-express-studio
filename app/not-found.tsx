import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="standalone-message">
      <span>404</span>
      <h1>העמוד הזה עוד לא נוצר.</h1>
      <p>ייתכן שהקישור השתנה, או שדף הנחיתה אינו מפורסם.</p>
      <Link className="button" href="/app">
        בחזרה לסטודיו ←
      </Link>
    </main>
  );
}
