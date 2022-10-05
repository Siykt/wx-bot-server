import { PrismaClient, UserRole } from '@prisma/client';
import { ContextFunction } from 'apollo-server-core';
import { ExtendableContext } from 'koa';
import { nanoid } from 'nanoid';
import Container, { ContainerInstance } from 'typedi';
import { User } from '../models/user';
import prisma from './prisma';
import { redis, CacheKeys, deserialize } from './redis';

export type UserWithRoles = User & { userRoles: UserRole[] };

export interface KoaContextType {
  user?: UserWithRoles | null;
  token?: string | null;
  visitorId: string;
  requestId: string;
  container: ContainerInstance;
  prisma: PrismaClient;
}

export interface ContextType extends KoaContextType {
  ctx: ExtendableContext;
}

export const graphqlContext: ContextFunction<ContextType> = async ({ ctx }) => {
  const { user, requestId, container, prisma, token, visitorId } = ctx as unknown as KoaContextType;
  return { ctx, user, requestId, container, prisma, token, visitorId };
};

export async function koaContext(ctx: ExtendableContext & KoaContextType, next: () => Promise<void>) {
  const requestId = nanoid();
  const container = Container.of(requestId);

  const token = ctx.request.headers.authorization ?? (ctx.request.query.imeanToken as string);
  let user: UserWithRoles | null | undefined;

  if (token) {
    const _user = await redis.get(CacheKeys.userSession(token));
    await redis.expire(CacheKeys.userSession(token), 3600 * 24 * 7 /** 7天过期 */);
    if (_user) {
      user = deserialize(_user);
    }
  }

  ctx.user = user;
  ctx.requestId = requestId;
  ctx.container = container;
  ctx.prisma = prisma;
  ctx.token = token;

  return await next();
}
