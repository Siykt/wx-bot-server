import { config } from 'dotenv';

let appHost = process.env.APP_HOST ?? 'http://127.0.0.1';

if (!appHost.startsWith('http')) {
  appHost = `https://${appHost}`;
}

config();

export const APP_HOST = appHost;
export const APP_PORT = +(process.env.APP_PORT ?? 10001);
export const APP_PREFIX = process.env.APP_PREFIX ?? '';
export const FILE_UPLOAD_SIZE = +(process.env.FILE_UPLOAD_SIZE ?? 10000000);

// REDIS
export const REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
export const REDIS_PORT = +(process.env.REDIS_PORT ?? 3306);
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
