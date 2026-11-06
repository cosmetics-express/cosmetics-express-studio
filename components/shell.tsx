'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Layers,
  Users,
  Settings,
  CreditCard,
  ShieldCheck,
  ChevronLeft,
  Search,
  Bell,
  HelpCircle,
  Menu,
  X,
  LogOut,
  Sparkles,
  ArrowUpLeft,
} from 'lucide-react';
import { Logo } from './ui';
import type { Clinic, Subscription } from '@/lib/types';
const nav = [
  { href: '/app', label: 'סקירה כללית', icon: LayoutDashboard },
  { href: '/app/campaigns', label: 'הקמפיינים שלי', icon: Layers },
  { href: '/app/leads', label: 'ניהול לידים', icon: Users },
  { href: '/app/settings', label: 'פרופיל הקליניקה', icon: Settings },
];
export function Shell({
  children,
  clinic,
  subscription: sub,
  admin,
  demo,
  newLeads,
}: {
  children: React.ReactNode;
  clinic: Clinic;
  subscription: Subscription;
  admin: boolean;
  demo: boolean;
  newLeads: number;
}) {
  const path = usePathname(),
    [open, setOpen] = useState(false),
    [notice, setNotice] = useState(false),
    [help, setHelp] = useState(false);
  const remaining = Math.max(0, sub.allowance + sub.bonus - sub.used);
  async function signout() {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (res.ok) location.href = '/login';
  }
  return (
    <div className="app-shell">
      {open && (
        <button className="sidebar-scrim" aria-label="סגירת תפריט" onClick={() => setOpen(false)} />
      )}
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <Link href="/app" className="sidebar-logo">
          <Logo />
        </Link>
        <button
          className="mobile-close icon-button"
          onClick={() => setOpen(false)}
          aria-label="סגירת תפריט"
        >
          <X size={20} />
        </button>
        <div className="workspace-label">סביבת העבודה שלך</div>
        <div className="clinic-switch">
          <span className="clinic-initial">{clinic.name.charAt(0)}</span>
          <span>
            <strong>{clinic.name}</strong>
            <small>הסטודיו האישי שלך</small>
          </span>
          <ChevronLeft size={15} />
        </div>
        <nav>
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`nav-link ${(href === '/app' ? path === href : path.startsWith(href)) ? 'active' : ''}`}
            >
              <Icon size={19} />
              {label}
              {href === '/app/leads' && newLeads > 0 && (
                <span className="nav-count">{newLeads}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="credit-card">
            <div className="credit-title">
              <Sparkles size={17} />
              <span>קצת AI, הרבה אפשרויות</span>
            </div>
            <p>
              <strong>{remaining}</strong> מתוך {sub.allowance + sub.bonus} קרדיטים זמינים
            </p>
            <div className="progress-track">
              <span
                style={{
                  width: `${Math.min(100, (remaining / (sub.allowance + sub.bonus)) * 100)}%`,
                }}
              />
            </div>
            <Link href="/app/billing">
              לפרטי החבילה <ArrowUpLeft size={14} />
            </Link>
          </div>
          <Link
            href="/app/billing"
            className={`nav-link ${path === '/app/billing' ? 'active' : ''}`}
          >
            <CreditCard size={18} />
            החבילה שלי
          </Link>
          {admin && (
            <Link href="/app/admin" className={`nav-link ${path === '/app/admin' ? 'active' : ''}`}>
              <ShieldCheck size={18} />
              ניהול הפלטפורמה
            </Link>
          )}
          <button className="nav-link signout" onClick={signout}>
            <LogOut size={17} />
            יציאה מהחשבון
          </button>
          <div className="sidebar-footer">
            <span className="online-dot" /> {demo ? 'סביבת הדגמה מקומית' : 'הסטודיו שלך מחובר'}{' '}
            <span dir="ltr">v1.0</span>
          </div>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div className="topbar-right">
            <button
              className="icon-button mobile-menu"
              onClick={() => setOpen(true)}
              aria-label="פתיחת תפריט"
            >
              <Menu size={21} />
            </button>
            <span className="topbar-title">הסטודיו שלי</span>
            <ChevronLeft size={14} />
            <span className="topbar-section">
              {path === '/app'
                ? 'סקירה כללית'
                : path.includes('editor')
                  ? 'הסטודיו לעיצוב'
                  : nav.find((n) => n.href !== '/app' && path.startsWith(n.href))?.label ||
                    'ניהול החשבון'}
            </span>
          </div>
          <div className="topbar-actions">
            <form action="/app/campaigns" className="header-search">
              <Search size={16} />
              <input name="q" placeholder="חיפוש קמפיין..." aria-label="חיפוש קמפיין" />
              <kbd>↵</kbd>
            </form>
            <div className="popover-anchor">
              <button
                className="icon-button"
                aria-label="עזרה"
                aria-expanded={help}
                onClick={() => {
                  setHelp(!help);
                  setNotice(false);
                }}
              >
                <HelpCircle size={19} />
              </button>
              {help && (
                <div className="top-popover">
                  <strong>הרעיון שלך. העיצוב שלנו.</strong>
                  <p>
                    יוצרים קמפיין, בוחרים כיוון ויזואלי ומאשרים יצירה. עריכת טקסט ושינוי פורמט תמיד
                    ללא קרדיט נוסף.
                  </p>
                  <Link href="/app/campaigns/new" onClick={() => setHelp(false)}>
                    בואו נתחיל ←
                  </Link>
                </div>
              )}
            </div>
            <div className="popover-anchor">
              <button
                className="icon-button notification-button"
                aria-label="התראות"
                aria-expanded={notice}
                onClick={() => {
                  setNotice(!notice);
                  setHelp(false);
                }}
              >
                <Bell size={19} />
                {newLeads > 0 && <i />}
              </button>
              {notice && (
                <div className="top-popover">
                  <strong>
                    {newLeads > 0 ? `${newLeads} לידים חדשים מחכים לך` : 'הכול מעודכן'}
                  </strong>
                  <p>כל פנייה מדף הנחיתה שלך מופיעה בניהול הלידים.</p>
                  <Link href="/app/leads" onClick={() => setNotice(false)}>
                    לצפייה בלידים ←
                  </Link>
                </div>
              )}
            </div>
            <Link href="/app/settings" className="avatar" aria-label="פרופיל הקליניקה">
              {clinic.name.charAt(0)}
            </Link>
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            <span />
            מצב הדגמה · נתונים מקומיים ואיורים לדוגמה · אין חיוב או יצירת תמונות אמיתית
          </div>
        )}
        <main className="main-content">{children}</main>
        <footer className="app-footer">
          <span>נוצר בשביל היופי שלך.</span>
          <span dir="ltr">COSMETICS EXPRESS STUDIO © {new Date().getFullYear()}</span>
        </footer>
      </div>
    </div>
  );
}
