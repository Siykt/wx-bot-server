import Redis from 'ioredis';
import { cloneDeep } from 'lodash';
import { SafeJsonType } from 'safe-json-type';
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from '../config';

const redis = new Redis(+(REDIS_PORT ?? '6379'), REDIS_HOST, { password: REDIS_PASSWORD });
const redisPublisher = new Redis(+(REDIS_PORT ?? '6379'), REDIS_HOST, { password: REDIS_PASSWORD });
const redisSubscriber = new Redis(+(REDIS_PORT ?? '6379'), REDIS_HOST, { password: REDIS_PASSWORD });

export function serialize(value: any) {
  return SafeJsonType.stringify(cloneDeep(value));
}

export function deserialize<T = any>(value: string) {
  return SafeJsonType.parse(value) as T;
}

export const CacheKeys = {
  userSession: (token: string) => `USER:${token}`,
};

export const CacheCleaners = {
  userSession: (userId: string) => redis.del(`USER:${userId}:*`),
};

export { redis, redisPublisher, redisSubscriber };
