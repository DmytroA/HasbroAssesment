export interface GameTemplate {
  id: string;
  name: string;
  formats: readonly string[];
  defaultDurationMinutes: number;
  defaultCapacity: number;
}

export interface StoreSettings {
  name: string;
  location: string;
  timeZone: string;
}
export interface AppConfig {
  store: StoreSettings;
  templates: GameTemplate[];
}
export interface CreateEventInput {
  name: string;
  templateId: string;
  format: string;
  startsAtLocal: string;
  capacity: number;
}
export interface EventSummary {
  id: string;
  name: string;
  templateId: string;
  gameName: string;
  format: string;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  location: string;
  capacity: number;
  registrationCount: number;
}
export interface EventDetail extends EventSummary {
  registrationUrl: string;
}
export interface RegistrationReceipt {
  id: string;
  name: string;
  eventId: string;
}
