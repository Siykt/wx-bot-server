import { Mutation } from 'type-graphql';
import { Service } from 'typedi';
import Bot from './bot.class';

@Service()
export class BotResolver {
  @Mutation(() => String, { description: '创建机器人' })
  async createBot() {
    const bot = new Bot();
    return await bot.asyncGetScanQrcode();
  }
}
