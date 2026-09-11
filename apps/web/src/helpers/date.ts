import type { EventSummary } from '@tabletop/contracts';

export function formatDate(value: string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone }).format(new Date(value));
}

export const eventTime = (event: EventSummary) =>
  `${formatDate(event.startsAt, event.timeZone, { hour: 'numeric', minute: '2-digit' })} – ${formatDate(event.endsAt, event.timeZone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}`;

export function groupByDay(events: EventSummary[]) {
  const groups = new Map<string, EventSummary[]>();
  for (const event of [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    const key = formatDate(event.startsAt, event.timeZone, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups.entries()];
}

// HTML date inputs need YYYY-MM-DD; use explicit parts instead of locale-dependent ordering.
export function dateKey(value: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
