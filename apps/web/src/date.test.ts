import { expect, test } from 'vitest';
import type { EventSummary } from '@tabletop/contracts';
import { groupByDay } from './date';
test('agenda groups UTC timestamps by store-local day and sorts chronologically', () => {
  const base = { id: '1', name: 'Event', templateId: 'magic', gameName: 'Magic', format: 'Commander', timeZone: 'America/Los_Angeles', location: 'Store', capacity: 2, registrationCount: 0, endsAt: '2099-06-13T04:00:00Z' };
  const events: EventSummary[] = [{ ...base, id: 'later', startsAt: '2099-06-13T18:00:00Z' }, { ...base, id: 'earlier', startsAt: '2099-06-13T01:00:00Z' }];
  const groups = groupByDay(events);
  expect(groups).toHaveLength(2);
  expect(groups[0][0]).toContain('June 12, 2099');
  expect(groups[0][1][0].id).toBe('earlier');
  expect(groups[1][0]).toContain('June 13, 2099');
});
