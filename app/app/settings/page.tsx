import { requireContext } from '@/lib/auth';
import { clinic } from '@/lib/store';
import { ClinicSettings } from '@/components/settings';
import { PageHeading } from '@/components/ui';
export default async function Settings() {
  const ctx = await requireContext();
  return (
    <>
      <PageHeading
        title="המותג שלך מתחיל כאן"
        description="מגדירים פעם אחת. יוצרים בשפה של הקליניקה שלך בכל פעם."
      />
      <ClinicSettings clinic={await clinic(ctx)} email={ctx.email} />
    </>
  );
}
