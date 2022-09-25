import { MiddlewareFn } from 'type-graphql';
import logger from './logger';

export const ErrorInterceptor: MiddlewareFn<any> = async ({}, next) => {
  try {
    return await next();
  } catch (err) {
    logger.error(err);
    throw err;
  }
};
