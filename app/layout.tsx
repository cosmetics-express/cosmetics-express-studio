import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: {
    default: 'Cosmetics Express Studio | הסטודיו של הקליניקה שלך',
    template: '%s | Cosmetics Express Studio',
  },
  description: 'מקליניקה למותג. סטודיו AI ליצירת קמפיינים, עיצובים ודפי נחיתה לקליניקות יופי.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
