import { AppShell } from '@/components/layout/app-shell';

/**
 * The signed-in area: dashboard, bookings, support, account, profile.
 *
 * Deliberately without the marketing header and footer. Once someone is logged
 * in they are here to check a booking or get help, and "All Services / About /
 * Refer & Earn / Contact" is navigation for a visitor deciding whether to buy,
 * not for a customer who already has.
 *
 * Booking stays one tap away in the shell — see AppShell for why that is not
 * optional.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
