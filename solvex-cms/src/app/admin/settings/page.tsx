import { schema } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireView } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { SettingsForm } from './settings-form';

export const metadata = { title: 'Settings — SolveX Admin' };

const DEFAULTS = { default_slot_capacity: 6, referral_reward_taka: 200 } as const;

export default async function SettingsPage() {
  await requireView('settings');

  const rows = await db().select().from(schema.settings);
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const num = (key: keyof typeof DEFAULTS) => {
    const parsed = Number.parseInt(map.get(key) ?? '', 10);
    return Number.isNaN(parsed) ? DEFAULTS[key] : parsed;
  };

  return (
    <>
      <Topbar breadcrumb={['Admin', 'Settings']} />
      <main className="flex-1 p-6">
        <PageHeader title="Settings" subtitle="Operational defaults for booking and referrals" />

        <Card>
          <CardBody>
            <SettingsForm
              defaultSlotCapacity={num('default_slot_capacity')}
              referralRewardTaka={num('referral_reward_taka')}
            />
          </CardBody>
        </Card>
      </main>
    </>
  );
}
