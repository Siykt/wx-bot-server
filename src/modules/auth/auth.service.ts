import { customAlphabet } from 'nanoid';
import { Service } from 'typedi';
import { CacheKeys, redis } from '../../common/redis';
import { SMTP_FORM } from '../../config';
import { sendMail } from '../../mail/mailer';

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 8);

@Service()
export class AuthService {
  async sendEmailCode(email: string, username = '', operate = '注册') {
    const key = CacheKeys.emailVerifyCode(Buffer.from(email.trim(), 'base64').toString());
    const code = (await redis.get(key)) ?? nanoid();
    redis.set(key, code, 'EX', 600);
    await sendMail({
      to: email,
      subject: '欢迎使用自动化机器人, 请查收您的验证码',
      templateName: 'email-verify',
      data: {
        username,
        code,
        operate,
        company: SMTP_FORM,
      },
    });
  }

  async verifyEmailCode(email: string, code: string) {
    const key = CacheKeys.emailVerifyCode(Buffer.from(email.trim(), 'base64').toString());
    const value = await redis.get(key);
    if (value) {
      if (value === code) {
        return true;
      }
      throw new Error('验证码错误!');
    }
    throw new Error('验证码已过期!');
  }
}
