import Link from 'next/link';
import { Logo } from './ui';
import { ArrowUpLeft } from 'lucide-react';
export function PublicNav() {
  return (
    <header className="public-nav">
      <Link href="/">
        <Logo />
      </Link>
      <nav>
        <Link href="/#how">איך זה עובד</Link>
        <Link href="/pricing">חבילות ומחירים</Link>
      </nav>
      <div>
        <Link href="/login" className="public-login">
          כניסה לחשבון
        </Link>
        <Link href="/signup" className="button button-small">
          מתחילים ליצור <ArrowUpLeft size={15} />
        </Link>
      </div>
    </header>
  );
}
