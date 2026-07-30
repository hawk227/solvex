/**
 * Integer BDT taka for display. en-BD groups in lakh/crore (2,00,000), which is
 * what a Dhaka reader expects — do not swap this for en-US.
 */
export function formatTaka(amount: number): string {
  return `৳${amount.toLocaleString('en-BD')}`;
}

export function formatDuration(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

/** "YYYY-MM-DD" as stored, rendered for a Dhaka reader. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Timestamp for an activity timeline, in Asia/Dhaka. */
export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
