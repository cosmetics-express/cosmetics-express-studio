import { requireContext } from '@/lib/auth';
import { list } from '@/lib/store';
import { PageHeading } from '@/components/ui';
import { LeadsTable } from '@/components/leads';
import type { Lead, Campaign } from '@/lib/types';
export default async function LeadsPage() {
  const ctx = await requireContext(),
    [leads, campaigns] = await Promise.all([
      list<Lead>(ctx, 'leads'),
      list<Campaign>(ctx, 'campaigns'),
    ]);
  return (
    <>
      <PageHeading
        eyebrow="היופי מתחיל בחיבור"
        title="אנשים חדשים. הזדמנויות חדשות."
        description="כל הפניות מהקמפיינים שלך, מסודרות בדרך לשיחה הבאה."
      />
      <LeadsTable leads={leads} campaigns={campaigns} />
    </>
  );
}
