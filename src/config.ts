import { config } from 'dotenv';
import path from 'path';

let appHost = process.env.APP_HOST ?? 'http://127.0.0.1';

if (!appHost.startsWith('http')) {
  appHost = `https://${appHost}`;
}

config();

export const APP_HOST = appHost;
export const APP_PORT = +(process.env.APP_PORT ?? 10001);
export const APP_PREFIX = process.env.APP_PREFIX ?? '';
export const FILE_UPLOAD_SIZE = +(process.env.FILE_UPLOAD_SIZE ?? 10000000);

// STORAGE
export const STORAGE_ADAPTER = process.env.STORAGE_ADAPTER ?? 'local';
export const STORAGE_PATH = process.env.STORAGE_PATH ?? path.resolve(__dirname, `../public/static/`);

// REDIS
export const REDIS_HOST = process.env.REDIS_HOST ?? '127.0.0.1';
export const REDIS_PORT = +(process.env.REDIS_PORT ?? 3306);
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// 邮件服务器
export const SMTP_FORM = process.env.SMTP_FORM! ?? 'Siykt';
export const SMTP_HOST = process.env.SMTP_HOST!;
export const SMTP_PORT = +process.env.SMTP_PORT! ?? 465;
export const SMTP_USER = process.env.SMTP_USER!;
export const SMTP_PASS = process.env.SMTP_PASS!;
export const SMTP_TLS = JSON.parse(process.env.SMTP_TLS ?? 'true');
