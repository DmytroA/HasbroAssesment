import type { EventSummary, RegistrationReceipt } from '@tabletop/contracts';

export type NewEvent = Omit<EventSummary, 'registrationCount'>;
export type RegistrationResult =
  | { status: 'registered'; receipt: RegistrationReceipt }
  | { status: 'missing' | 'full' | 'duplicate' | 'busy' };

// The persistence port keeps transaction details out of HTTP handlers and business rules.
export abstract class EventsRepository {
  abstract list(): EventSummary[];
  abstract find(id: string): EventSummary | undefined;
  abstract create(event: NewEvent): EventSummary;
  abstract register(eventId: string, name: string, normalizedName: string): RegistrationResult;
}
