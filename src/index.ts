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
import { buildSchema, ForbiddenError, UnauthorizedError } from 'type-graphql';
import Container from 'typedi';
import { authChecker } from './common/authChecker';
import { graphqlContext, koaContext } from './common/context';
import logger from './common/logger';
import prisma from './common/prisma';
import { APP_PORT, FILE_UPLOAD_SIZE } from './config';
import resolvers from './modules';
import { Prisma } from '@prisma/client';
import { NotfoundError } from './common/errors';
import { ErrorInterceptor } from './common/error.interceptor';

const app = new koa({ proxy: true });
app.on('error', (err) => {
  console.error(err);
});

async function checkInitAdminAccount() {
  const adminRole = await prisma.userRole.findFirst({ where: { type: UserRoleType.SystemAdmin } });
  if (!adminRole) {
    logger.info('初始化管理员...');
    await prisma.user.create({
      data: {
        id: nanoid(),
        nickname: 'Admin',
        username: 'admin',
        password: 'de3bc5b5398ab151e47135a773d11110', // siykt.com
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
      globalMiddlewares: [ErrorInterceptor],
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
    plugins: [
      ApolloServerPluginLandingPageLocalDefault(),
      {
        async requestDidStart() {
          return {
            async willSendResponse({ context }) {
              Container.reset(context.requestId);
            },
            async didEncounterErrors({ response, errors }) {
              logger.error(errors);
              const error = errors[0].originalError;
              if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
                response!.http!.status = 401;
              } else if (error instanceof NotfoundError) {
                response!.http!.status = 404;
              } else if (error!.name === 'PayloadTooLargeError') {
                response!.http!.status = 413;
                errors[0].message = error!.message = '文件大小超出限制!';
              } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
                errors[0].message = error!.message = 'Database error!';
                delete error.meta;
              }
            },
          };
        },
      },
    ],
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
