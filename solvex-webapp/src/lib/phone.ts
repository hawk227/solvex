/**
 * Bangladeshi mobile numbers.
 *
 * Customers type these many ways (01712345678, +8801712345678, 8801712345678,
 * with spaces or dashes). A technician has to dial the stored value, so it is
 * normalised to one canonical form: +8801XXXXXXXXX.
 *
 * Operator prefixes in service are 013–019; 010/011/012 are not valid.
 */
const BD_MOBILE = /^(?:\+?88)?(01[3-9]\d{8})$/;

export function normaliseBdMobile(input: string): string | null {
  const stripped = input.trim().replace(/[\s()-]/g, '');
  const match = BD_MOBILE.exec(stripped);
  if (!match) return null;
  return `+88${match[1]}`;
}

/** Grouped for display: +880 1712-345678 */
export function formatBdMobile(normalised: string): string {
  const m = /^\+88(01\d)(\d{4})(\d{4})$/.exec(normalised);
  if (!m) return normalised;
  return `+880 ${m[1]!.slice(1)}${m[2]!.slice(0, 1)}-${m[2]!.slice(1)}${m[3]}`;
}
