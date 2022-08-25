import koa from 'koa';
import mount from 'koa-mount';
import koaStatic from 'koa-static';
import path from 'path';
import bodyParser from 'koa-bodyparser';
import 'reflect-metadata';
import logger from './common/logger';
import { ApolloServer } from 'apollo-server-koa';
import { ApolloServerPluginLandingPageLocalDefault } from 'apollo-server-core';
import { graphqlUploadKoa } from 'graphql-upload';
import { buildSchema } from 'type-graphql';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { APP_PORT, FILE_UPLOAD_SIZE } from './config';
import Container from 'typedi';
import resolvers from './modules';
import { graphqlContext } from './common/context';
import { authChecker } from './common/authChecker';
import prisma from './common/prisma';
import { UserRoleType } from '@prisma/client';
import { nanoid } from 'nanoid';

const app = new koa({ proxy: true });

async function checkInitAdminAccount() {
  const adminRole = await prisma.userRole.findFirst({ where: { type: UserRoleType.SystemAdmin } });
  if (!adminRole) {
    logger.info('初始化管理员...');
    await prisma.user.create({
      data: {
        id: nanoid(),
        nickname: 'Admin',
        username: 'admin',
        password: '21232f297a57a5a743894a0e4a801fc3', // admin
        userRoles: {
          create: {
            type: UserRoleType.SystemAdmin,
            id: nanoid(),
          },
        },
      },
    });

    logger.info('管理员用户已经创建: admin/admin');
  }
}

async function bootstrap() {
  logger.info('服务器启动中...');
  await checkInitAdminAccount();

  const server = new ApolloServer({
    introspection: true,
    context: graphqlContext,
    schema: await buildSchema({
      globalMiddlewares: [],
      scalarsMap: [
        {
          type: () => GraphQLJSON,
          scalar: GraphQLJSONObject,
        },
      ],
      resolvers,
      container: Container,
      authChecker,
    }),
    plugins: [ApolloServerPluginLandingPageLocalDefault()],
  });

  await server.start();

  app.use(mount('/files', koaStatic(path.resolve(__dirname, '../public'))));
  app.use(bodyParser());
  app.use(graphqlUploadKoa({ maxFileSize: FILE_UPLOAD_SIZE, maxFiles: 10 }));

  server.applyMiddleware({ app, path: '/graphql' });

  logger.info(`服务器已准备就绪: http://localhost:${APP_PORT}${server.graphqlPath}`);
  app.listen({ port: APP_PORT });
}

bootstrap();
