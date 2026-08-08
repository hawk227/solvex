import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { schema } from '@solvex/db';
import { auth } from './auth';
import { db } from './cf';

export type Customer = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
};

export type CustomerProfile = {
  fullName: string;
  phone: string;
  address: string;
  areaId: number | null;
  /** Finest-grained address pick. Informational only — see schema note on profiles.locationId. */
  locationId: number | null;
  referralCode: string;
};

export async function getCustomer(): Promise<Customer | null> {
  const result = await auth().api.getSession({ headers: await headers() });
  if (!result?.user) return null;
  return {
    id: result.user.id,
    name: result.user.name,
    email: result.user.email,
    emailVerified: Boolean(result.user.emailVerified),
  };
}

export async function getProfile(userId: string): Promise<CustomerProfile | null> {
  const [row] = await db()
    .select({
      fullName: schema.profiles.fullName,
      phone: schema.profiles.phone,
      address: schema.profiles.address,
      areaId: schema.profiles.areaId,
      locationId: schema.profiles.locationId,
      referralCode: schema.profiles.referralCode,
    })
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, userId))
    .limit(1);

  return row ?? null;
}

/** Signed in, or redirected to login with a return path. */
export async function requireCustomer(returnTo?: string): Promise<Customer> {
  const customer = await getCustomer();
  if (!customer) {
    redirect(`/login${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ''}`);
  }
  return customer;
}

/**
 * Signed in AND profile complete. Booking needs a name, phone and address, so
 * this gate runs server-side in every protected page and action — a client-side
 * redirect would be trivially skipped by posting straight to an action.
 */
export async function requireCompleteProfile(
  returnTo?: string,
): Promise<{ customer: Customer; profile: CustomerProfile }> {
  const customer = await requireCustomer(returnTo);
  const profile = await getProfile(customer.id);

  if (!profile) {
    redirect(`/profile/complete${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ''}`);
  }

  return { customer, profile };
}
