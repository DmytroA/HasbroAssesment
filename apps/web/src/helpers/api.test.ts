import { afterEach, expect, test, vi } from 'vitest';
import { api, ApiError } from './api';

afterEach(() => vi.unstubAllGlobals());

test('validation errors retain HTTP status and combine the server messages', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ message: ['Name is required.', 'Capacity must be at most 30.'] }),
          { status: 400 },
        ),
      ),
  );
  await expect(api.events()).rejects.toMatchObject({
    name: 'Error',
    status: 400,
    message: 'Name is required. Capacity must be at most 30.',
  });
});

test('a non-JSON proxy failure produces a readable error instead of a JSON parsing error', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('<html>Proxy unavailable</html>', { status: 502 })),
  );
  await expect(api.events()).rejects.toMatchObject({
    status: 502,
    message: 'Something went wrong. Please try again.',
  });
});

test('a registration conflict keeps the server explanation', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'This name is already registered.' }), {
        status: 409,
      }),
    ),
  );
  const error = await api.register('event-id', 'Alex').catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status: 409, message: 'This name is already registered.' });
});

test('network failure is surfaced without silently retrying a registration', async () => {
  const failure = new TypeError('Failed to fetch');
  const fetchMock = vi.fn().mockRejectedValue(failure);
  vi.stubGlobal('fetch', fetchMock);
  await expect(api.register('event-id', 'Alex')).rejects.toBe(failure);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
