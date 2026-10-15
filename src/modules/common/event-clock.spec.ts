import { nowInEventClock, todayInEventClock } from './event-clock';

describe('event clock - Unitary Test', () => {
  it('should convert the current instant to the college wall-clock time marked as UTC', () => {
    expect(nowInEventClock(new Date('2026-10-15T23:30:00.000Z')).toISOString()).toBe('2026-10-15T20:30:00.000Z');
  });

  it('should keep the local date after 21h, when UTC is already on the next day', () => {
    expect(todayInEventClock(new Date('2026-10-16T01:00:00.000Z'))).toBe('2026-10-15');
  });

  it('should move to the next date only after local midnight', () => {
    expect(todayInEventClock(new Date('2026-10-16T03:00:00.000Z'))).toBe('2026-10-16');
  });
});
