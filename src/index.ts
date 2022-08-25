import { UserRoleType } from '@prisma/client';
import { ApolloServerPluginLandingPageLocalDefault } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-koa';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { graphqlUploadKoa } from 'graphql-upload';
import koa from 'koa';
import bodyParser from 'koa-bodyparser';
import mount from 'koa-mount';
import koaStatic from 'koa-static';
import { nanoid } from 'nanoid';
import path from 'path';
import 'reflect-metadata';
import { buildSchema } from 'type-graphql';
import Container from 'typedi';
import { authChecker } from './common/authChecker';
import { graphqlContext, koaContext } from './common/context';
import logger from './common/logger';
import prisma from './common/prisma';
import { APP_PORT, FILE_UPLOAD_SIZE } from './config';
import resolvers from './modules';

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

  app.use(koaContext);

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
