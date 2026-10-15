// Event dates and times are stored as the local wall-clock time of the college marked as UTC
// (19:00 in Itu is saved as 19:00Z). Comparisons with "now" must use that same representation,
// whatever time zone the server runs in.
const EVENT_TIME_ZONE = 'America/Sao_Paulo';

const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: EVENT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function nowInEventClock(date: Date = new Date()): Date {
  const parts = Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]));
  return new Date(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.000Z`);
}

export function todayInEventClock(date: Date = new Date()): string {
  return nowInEventClock(date).toISOString().split('T')[0];
}
