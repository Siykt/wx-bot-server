import { nanoid } from 'nanoid';
import { Arg, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { md5 } from '../../common/crypto';
import prisma from '../../common/prisma';
import { CacheKeys, redis, serialize } from '../../common/redis';
import { AuthService } from './auth.service';

const SESSION_EXPIRES = 3600 * 24 * 7;

@Resolver()
@Service()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => Boolean, { description: '发送邮件验证码' })
  async requestEmailCode(@Arg('email') email: string) {
    await this.authService.sendEmailCode(email);
    return true;
  }

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
    if (!user || !password) throw new Error('用户名或密码错误');
    await prisma.user.update({ where: { id: user.id }, data: {} });
    const token = CacheKeys.genUserSessionToken(user.id);
    await redis.set(CacheKeys.userSession(token), serialize(user), 'EX', SESSION_EXPIRES);
    return token;
  }

  @Mutation(() => Boolean, { description: '邮箱注册' })
  async signUpByEmail(
    @Arg('email') email: string,
    @Arg('code') code: string,
    @Arg('nickname') nickname: string,
    @Arg('password') password: string
  ) {
    if (!password) throw new Error('密码不能为空!');
    const user = await prisma.user.findFirst({ where: { email } });
    await this.authService.verifyEmailCode(email, code);
    if (user) throw new Error('邮箱已被注册!');
    await prisma.user.create({
      data: {
        id: nanoid(),
        username: email,
        nickname,
        email,
        password,
      },
      include: { userRoles: true },
    });
    return true;
  }
}
