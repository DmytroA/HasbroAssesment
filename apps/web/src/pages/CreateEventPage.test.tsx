// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '../api';
import { CreateEventPage } from './CreateEventPage';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
test('changing game applies its formats, duration, and default capacity; valid submission navigates to the event', async () => {
  vi.spyOn(api, 'config').mockResolvedValue({
    store: { name: 'Store', location: '123 Main St', timeZone: 'America/Los_Angeles' },
    templates: [
      {
        id: 'magic',
        name: 'Magic: The Gathering',
        formats: ['Commander'],
        defaultDurationMinutes: 180,
        defaultCapacity: 24,
      },
      {
        id: 'chess',
        name: 'Chess',
        formats: ['Rapid', 'Blitz'],
        defaultDurationMinutes: 45,
        defaultCapacity: 8,
      },
    ],
  });
  const create = vi
    .spyOn(api, 'create')
    .mockResolvedValue({ id: 'created-event' } as Awaited<ReturnType<typeof api.create>>);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/events/new']}>
        <Routes>
          <Route path="/events/new" element={<CreateEventPage />} />
          <Route path="/events/:id" element={<p>Event created successfully</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await userEvent.selectOptions(await screen.findByLabelText('Game'), 'chess');
  expect((screen.getByLabelText('Play format') as HTMLSelectElement).value).toBe('Rapid');
  expect((screen.getByLabelText(/Player capacity/) as HTMLInputElement).value).toBe('8');
  expect(screen.getByText(/Store time:.*Duration: 45 minutes/)).toBeTruthy();
  await userEvent.type(screen.getByLabelText('Event name'), 'Rapid evening');
  const date = screen.getByLabelText(/Date & start time/);
  // Native datetime controls are supplied as local wall time, never converted by the browser's timezone.
  const { fireEvent } = await import('@testing-library/react');
  fireEvent.change(date, { target: { value: '2099-06-12T18:00' } });
  await userEvent.click(screen.getByRole('button', { name: 'Create event' }));
  expect(await screen.findByText('Event created successfully')).toBeTruthy();
  expect(create.mock.calls[0][0]).toEqual({
    name: 'Rapid evening',
    templateId: 'chess',
    format: 'Rapid',
    startsAtLocal: '2099-06-12T18:00',
    capacity: 8,
  });
});
