import Link from 'next/link';
import { MapPin, Phone, User } from 'lucide-react';
import { Container, Section } from '@/components/layout/container';
import { AccountNav } from '@/components/layout/account-nav';
import { Button } from '@/components/ui/button';
import { getActiveAreas } from '@/lib/catalog';
import { getReferralSummary, listMyReferrals } from '@/lib/referrals';
import { getProfile, requireCustomer } from '@/lib/session';
import { formatBdMobile } from '@/lib/phone';
import { formatTaka } from '@/lib/format';
import { ReferralCode } from './referral-code';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your account' };

export default async function AccountPage() {
  const customer = await requireCustomer('/account');
  const [profile, areas, referrals, myReferrals] = await Promise.all([
    getProfile(customer.id),
    getActiveAreas(),
    getReferralSummary(customer.id),
    listMyReferrals(customer.id),
  ]);

  const areaName = areas.find((a) => a.id === profile?.areaId)?.name ?? null;

  return (
    <main className="flex-1">
      <AccountNav />
      <Section>
        <Container>
          <h1 className="text-3xl font-semibold text-[var(--color-text)] md:text-4xl">
            Your account
          </h1>
          <p className="mt-2 text-[var(--color-muted)]">{customer.email}</p>

          {!profile ? (
            <div className="mt-8 rounded-[var(--web-card-radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <h2 className="font-bold text-[var(--color-text)]">Finish your profile</h2>
              <p className="mt-2 max-w-[52ch] text-[var(--color-muted)]">
                We need your name, mobile number and address before you can book.
              </p>
              <Button asChild className="mt-4">
                <Link href="/profile/complete">Complete profile</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-[var(--web-card-radius)] border border-[var(--color-border)] bg-[var(--color-card)] p-6">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="font-bold text-[var(--color-text)]">Your details</h2>
                  <Button asChild variant="ghost" size="md">
                    <Link href="/profile/complete">Edit</Link>
                  </Button>
                </div>

                <dl className="mt-4 flex flex-col gap-4">
                  <div className="flex gap-3">
                    <User aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted)]" />
                    <div>
                      <dt className="text-[var(--web-font-size-caption)] uppercase tracking-wide text-[var(--color-muted)]">
                        Name
                      </dt>
                      <dd>{profile.fullName}</dd>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Phone aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted)]" />
                    <div>
                      <dt className="text-[var(--web-font-size-caption)] uppercase tracking-wide text-[var(--color-muted)]">
                        Mobile
                      </dt>
                      <dd>{formatBdMobile(profile.phone)}</dd>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted)]" />
                    <div>
                      <dt className="text-[var(--web-font-size-caption)] uppercase tracking-wide text-[var(--color-muted)]">
                        Address
                      </dt>
                      <dd>
                        {profile.address}
                        {areaName && (
                          <span className="text-[var(--color-muted)]"> · {areaName}</span>
                        )}
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>

              <div className="rounded-[var(--web-card-radius)] border border-[var(--color-border)] bg-[var(--color-card)] p-6">
                <h2 className="font-bold text-[var(--color-text)]">Refer a friend</h2>
                <p className="mt-2 text-[var(--web-font-size-small)] text-[var(--color-muted)]">
                  Share this code. When their first booking is completed, your account is credited.
                </p>
                <ReferralCode code={profile.referralCode} />

                <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-[var(--color-border)] pt-4 text-center">
                  <div>
                    <dt className="text-[var(--web-font-size-caption)] text-[var(--color-muted)]">
                      Invited
                    </dt>
                    <dd className="text-xl font-bold">{referrals.invited}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--web-font-size-caption)] text-[var(--color-muted)]">
                      Rewarded
                    </dt>
                    <dd className="text-xl font-bold">{referrals.rewarded}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--web-font-size-caption)] text-[var(--color-muted)]">
                      Credit left
                    </dt>
                    <dd className="text-xl font-bold text-[var(--color-success)]">
                      {formatTaka(referrals.balance)}
                    </dd>
                  </div>
                </dl>

                {myReferrals.length > 0 && (
                  <ul className="mt-4 flex flex-col gap-2 border-t border-[var(--color-border)] pt-4">
                    {myReferrals.map((r, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-3 text-[var(--web-font-size-small)]"
                      >
                        <span>{r.refereeName ?? 'A friend'}</span>
                        <span
                          className={
                            r.status === 'REWARDED'
                              ? 'text-[var(--color-success)]'
                              : 'text-[var(--color-muted)]'
                          }
                        >
                          {r.status === 'REWARDED' ? 'Credited' : 'Awaiting first job'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <Link
                  href="/referral"
                  className="mt-4 inline-flex items-center gap-1 text-[var(--web-font-size-small)] text-[var(--color-primary)] hover:underline"
                >
                  How referrals work
                </Link>
              </div>
            </div>
          )}
        </Container>
      </Section>
    </main>
  );
}
