// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api, ApiError } from '../helpers/api';
import { EventPage } from './EventPage';

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
  capacity: 24,
  registrationCount: 3,
  registrationUrl: 'http://192.168.1.50:5173/events/event-1/register',
};
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function open() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/events/event-1']}>
        <Routes>
          <Route path="/events/:id" element={<EventPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test('event details offer the correct calendar download and copy the configured registration URL', async () => {
  const user = userEvent.setup();
  vi.spyOn(api, 'event').mockResolvedValue(event);
  const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  open();
  await screen.findByRole('heading', { name: event.name });
  expect(screen.getByRole('link', { name: /Calendar invite/ }).getAttribute('href')).toBe(
    '/api/events/event-1/calendar.ics',
  );
  expect(screen.getByRole('link', { name: 'Register to play' }).getAttribute('href')).toBe(
    '/events/event-1/register',
  );
  await user.click(screen.getByRole('button', { name: 'Copy link' }));
  expect(copy).toHaveBeenCalledWith(event.registrationUrl);
  expect(await screen.findByText('Link copied.')).toBeTruthy();
});

test('clipboard permission failure keeps a manually copyable registration link', async () => {
  const user = userEvent.setup();
  vi.spyOn(api, 'event').mockResolvedValue(event);
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Permission denied'));
  open();
  await screen.findByRole('heading', { name: event.name });
  await user.click(screen.getByRole('button', { name: 'Copy link' }));
  expect(await screen.findByText('Select and copy the registration link above.')).toBeTruthy();
  expect((screen.getByLabelText('Registration link') as HTMLInputElement).value).toBe(
    event.registrationUrl,
  );
});

test('failed QR image leaves registration available through the link', async () => {
  vi.spyOn(api, 'event').mockResolvedValue(event);
  open();
  const qr = await screen.findByRole('img', { name: `QR code for ${event.name} registration` });
  fireEvent.error(qr);
  expect(screen.getByText('QR code unavailable. Use the registration link below.')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Register to play' }).getAttribute('href')).toBe(
    '/events/event-1/register',
  );
  expect((screen.getByLabelText('Registration link') as HTMLInputElement).value).toBe(
    event.registrationUrl,
  );
});

test('a missing event gives an error and a way back without showing invalid invite actions', async () => {
  vi.spyOn(api, 'event').mockRejectedValue(new ApiError('Event not found.', 404));
  open();
  expect((await screen.findByRole('alert')).textContent).toBe('Event not found.');
  expect(screen.getByRole('link', { name: /All events/ }).getAttribute('href')).toBe('/');
  expect(screen.queryByRole('link', { name: /Calendar invite/ })).toBeNull();
});
