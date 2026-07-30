import { schema } from '@solvex/db';
import { db } from '@/lib/cf';
import { canManage, requireView } from '@/lib/session';
import { Topbar, PageHeader } from '@/components/layout/page-header';
import { ReadOnlyNotice } from '@/components/ui/read-only-notice';
import { Card, CardBody } from '@/components/ui/card';
import { SettingsForm } from './settings-form';

export const metadata = { title: 'Settings — SolveX Admin' };

const DEFAULTS = { default_slot_capacity: 6, referral_reward_taka: 200 } as const;

export default async function SettingsPage() {
  const employee = await requireView('settings');
  const editable = canManage(employee, 'settings');

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
            {editable ? (
              <SettingsForm
                defaultSlotCapacity={num('default_slot_capacity')}
                referralRewardTaka={num('referral_reward_taka')}
              />
            ) : (
              <>
                <ReadOnlyNotice what="settings" />
                <dl className="mt-5 flex flex-col gap-3 text-[13px]">
                  <div>
                    <dt className="text-[var(--color-muted)]">Default slot capacity</dt>
                    <dd className="font-medium">{num('default_slot_capacity')}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-muted)]">Referral reward</dt>
                    <dd className="font-medium">৳{num('referral_reward_taka')}</dd>
                  </div>
                </dl>
              </>
            )}
          </CardBody>
        </Card>
      </main>
    </>
  );
}
