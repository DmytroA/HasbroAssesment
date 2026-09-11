// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '../helpers/api';
import { AgendaPage } from './AgendaPage';

const base = {
  templateId: 'magic',
  gameName: 'Magic: The Gathering',
  format: 'Commander',
  timeZone: 'America/Los_Angeles',
  location: 'Store',
  capacity: 24,
  registrationCount: 0,
  endsAt: '2099-06-13T22:00:00.000Z',
};
function open() {
  vi.spyOn(api, 'config').mockResolvedValue({
    store: { name: 'Store', location: 'Store', timeZone: base.timeZone },
    templates: [],
  });
  vi.spyOn(api, 'events').mockResolvedValue([
    { ...base, id: 'evening', name: 'Evening Commander', startsAt: '2099-06-13T01:00:00.000Z' },
    { ...base, id: 'afternoon', name: 'Afternoon Magic', startsAt: '2099-06-13T18:00:00.000Z' },
  ]);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AgendaPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test('organizer selects a store-local date, sees an empty day, and restores all events', async () => {
  open();
  await screen.findByRole('heading', { name: 'Evening Commander' });
  expect(screen.getByRole('heading', { name: 'Afternoon Magic' })).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Event date'), { target: { value: '2099-06-12' } });
  expect(screen.getByRole('heading', { name: 'Evening Commander' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Afternoon Magic' })).toBeNull();
  fireEvent.change(screen.getByLabelText('Event date'), { target: { value: '2099-06-14' } });
  expect(screen.getByRole('heading', { name: 'No events scheduled' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Evening Commander' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'All dates' }));
  expect(screen.getByRole('heading', { name: 'Evening Commander' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Afternoon Magic' })).toBeTruthy();
  expect((screen.getByLabelText('Event date') as HTMLInputElement).value).toBe('');
});

test('Today selects the store date even when UTC is already the next day', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2099-06-13T01:30:00.000Z'));
  open();
  await screen.findByRole('heading', { name: 'Evening Commander' });
  const today = screen.getByRole('button', { name: 'Today' });
  await waitFor(() => expect((today as HTMLButtonElement).disabled).toBe(false));
  await userEvent.click(today);
  expect((screen.getByLabelText('Event date') as HTMLInputElement).value).toBe('2099-06-12');
  expect(screen.getByRole('heading', { name: 'Evening Commander' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Afternoon Magic' })).toBeNull();
});
