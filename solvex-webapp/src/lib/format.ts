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
