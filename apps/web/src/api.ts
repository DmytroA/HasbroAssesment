import type { AppConfig, CreateEventInput, EventDetail, EventSummary, RegistrationReceipt } from '@tabletop/contracts';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options, headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;
    throw new ApiError(message || 'Something went wrong. Please try again.', response.status);
  }
  return response.json();
}
export const api = {
  config: () => request<AppConfig>('/config'),
  events: () => request<EventSummary[]>('/events'),
  event: (id: string) => request<EventDetail>(`/events/${encodeURIComponent(id)}`),
  create: (input: CreateEventInput) => request<EventDetail>('/events', { method: 'POST', body: JSON.stringify(input) }),
  register: (id: string, name: string) => request<RegistrationReceipt>(`/events/${encodeURIComponent(id)}/registrations`, { method: 'POST', body: JSON.stringify({ name }) }),
};
