import { requireContext } from '@/lib/auth';
import { subscription } from '@/lib/usage';
import { isDemo } from '@/lib/supabase';
import { PageHeading } from '@/components/ui';
import { Wizard } from '@/components/wizard';
export default async function NewCampaign() {
  const ctx = await requireContext(),
    sub = await subscription(ctx);
  return (
    <>
      <PageHeading
        eyebrow="רעיון טוב מתחיל כאן"
        title="יוצרים את הקמפיין הבא"
        description="כמה פרטים על הטיפול, ואנחנו כבר בדרך לעיצוב שלך."
      />
      <Wizard remaining={Math.max(0, sub.allowance + sub.bonus - sub.used)} demo={isDemo()} />
    </>
  );
}
