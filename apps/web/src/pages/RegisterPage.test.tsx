// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api, ApiError } from '../api';
import { RegisterPage } from './RegisterPage';

const event = {
  id: 'event-1',
  name: 'Friday Magic',
  templateId: 'magic',
  gameName: 'Magic: The Gathering',
  format: 'Commander',
  startsAt: '2099-06-13T01:00:00.000Z',
  endsAt: '2099-06-13T04:00:00.000Z',
  timeZone: 'America/Los_Angeles',
  location: '123 Main Street',
  capacity: 1,
  registrationCount: 0,
  registrationUrl: 'https://example.com/events/event-1/register',
};
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function open() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/events/event-1/register']}>
        <Routes>
          <Route path="/events/:id/register" element={<RegisterPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
test('player registers and sees a confirmed seat and calendar download', async () => {
  vi.spyOn(api, 'event').mockResolvedValue(event);
  const register = vi
    .spyOn(api, 'register')
    .mockResolvedValue({ id: 'registration-1', eventId: event.id, name: 'Alex' });
  open();
  await userEvent.type(await screen.findByLabelText('Your name'), 'Alex');
  await userEvent.click(screen.getByRole('button', { name: 'Confirm registration' }));
  expect(await screen.findByRole('heading', { name: "You're on the list." })).toBeTruthy();
  expect(register).toHaveBeenCalledWith(event.id, 'Alex');
  expect(screen.getByRole('link', { name: 'Add to calendar' }).getAttribute('href')).toBe(
    '/api/events/event-1/calendar.ics',
  );
});
test('full events show a clear message and no registration form', async () => {
  vi.spyOn(api, 'event').mockResolvedValue({ ...event, registrationCount: 1 });
  open();
  expect(await screen.findByText('This event is full. No seats remain.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Confirm registration' })).toBeNull();
});
test('a last-seat server rejection is shown even if the UI previously showed availability', async () => {
  vi.spyOn(api, 'event').mockResolvedValue(event);
  vi.spyOn(api, 'register').mockRejectedValue(
    new ApiError('This event is full. No seats remain.', 409),
  );
  open();
  await userEvent.type(await screen.findByLabelText('Your name'), 'Alex');
  await userEvent.click(screen.getByRole('button', { name: 'Confirm registration' }));
  expect((await screen.findByRole('alert')).textContent).toContain('This event is full');
  expect(screen.queryByText("You're on the list.")).toBeNull();
});
