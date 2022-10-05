import { Arg, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { md5 } from '../../common/crypto';
import prisma from '../../common/prisma';
import { CacheKeys, redis, serialize } from '../../common/redis';

const SESSION_EXPIRES = 3600 * 24 * 7;

@Resolver()
@Service()
export class AuthResolver {
  @Mutation(() => String, { description: '密码登录' })
  async pwdLogin(@Arg('username') username: string, @Arg('password') password: string) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { mobilePhoneNumber: username, mobilePhoneVerified: true },
          { username },
          { email: username, emailVerified: true },
        ],
        password: { in: [password, md5(password)] },
      },
      include: { userRoles: true },
    });
    if (!user || !password) {
      throw new Error('用户名或密码错误');
    }
    await prisma.user.update({ where: { id: user.id }, data: {} });
    const token = CacheKeys.genUserSessionToken(user.id);
    await redis.set(CacheKeys.userSession(token), serialize(user), 'EX', SESSION_EXPIRES);
    return token;
  }
}
