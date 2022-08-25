import { Service } from 'typedi';
import Bot, { botMap } from './bot.class';

@Service()
export class BotService {
  async createBot(...args: ConstructorParameters<typeof Bot>) {
    const bot = new Bot(...args);
    return {
      id: bot.id,
      scanQrcode: await bot.asyncGetScanQrcode(),
    };
  }

  getBot(id: string) {
    return botMap.get(id);
  }

  async getBotInfo(id: string) {
    const bot = this.getBot(id);
    if (!bot) return null;
    await bot.waitingReady();
    return bot.ctx.botUser;
  }
}
