/** Integer BDT taka, formatted for display. Never used for arithmetic. */
export function formatTaka(amount: number): string {
  return `৳${amount.toLocaleString('en-BD')}`;
}

/** "YYYY-MM-DD" as stored, rendered for a Dhaka reader. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
