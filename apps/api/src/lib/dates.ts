/** Parses an optional ISO date from user input: `undefined` when absent, `null` when malformed. */
export function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
