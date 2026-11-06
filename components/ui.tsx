import Link from 'next/link';
import { ArrowUpLeft, Plus, Sparkles, Flower2 } from 'lucide-react';
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`brand ${light ? 'brand-light' : ''}`}>
      <span className="brand-icon">
        <Flower2 size={25} strokeWidth={1.5} />
      </span>
      <span dir="ltr">
        cosmetics
        <span className="brand-express">
          express <b>studio</b>
        </span>
      </span>
    </span>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function NewCampaignButton() {
  return (
    <Link href="/app/campaigns/new" className="button">
      <Plus size={18} />
      יצירת קמפיין חדש
    </Link>
  );
}
export function EmptyState({
  title,
  description,
  href,
  label,
}: {
  title: string;
  description: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Sparkles size={26} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {href && (
        <Link href={href} className="button">
          {label}
          <ArrowUpLeft size={16} />
        </Link>
      )}
    </div>
  );
}
export function Pill({ children, tone = 'green' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}
