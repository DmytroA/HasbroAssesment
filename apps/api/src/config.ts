import { resolve } from 'node:path';
import { config } from 'dotenv';
import { DateTime } from 'luxon';
import type { StoreSettings } from '@tabletop/contracts';

export const projectRoot = resolve(__dirname, '../../..');
config({ path: resolve(projectRoot, '.env'), quiet: true });

export interface RuntimeConfig {
  databasePath: string;
  publicUrl: string;
  port: number;
  store: StoreSettings;
}
export function readConfig(): RuntimeConfig {
  const publicUrl = process.env.PUBLIC_URL ?? 'http://localhost:5173';
  const url = new URL(publicUrl);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('PUBLIC_URL must be an http(s) origin, for example http://localhost:5173');
  }
  const timeZone = process.env.STORE_TIME_ZONE ?? 'America/Los_Angeles';
  if (!DateTime.now().setZone(timeZone).isValid) throw new Error('Invalid STORE_TIME_ZONE');
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  return {
    databasePath: resolve(projectRoot, process.env.DATABASE_PATH ?? 'data/tabletop.sqlite'),
    publicUrl: url.origin,
    port,
    store: {
      name: process.env.STORE_NAME ?? 'The Gathering Place',
      location: process.env.STORE_LOCATION ?? '123 Main Street, Seattle, WA',
      timeZone,
    },
  };
}
export const RUNTIME_CONFIG = Symbol('RUNTIME_CONFIG');
