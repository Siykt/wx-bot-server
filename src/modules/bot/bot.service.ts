import { Service } from 'typedi';
import prisma from '../../common/prisma';
import { BotContact, BotRoom } from '../../models/bot';
import Bot, { BotStatus } from './bot.class';

@Service()
export class BotService {
  async createBotByLocal(id: string, name?: string) {
    const bot = new Bot(name, true);
    await bot.start();
    Bot.setBot(id, bot);
    return bot;
  }

  getBotByLocal(id: string) {
    return Bot.getBot(id);
  }

  async getBotContacts(botId: string): Promise<BotContact[]> {
    const bot = this.getBotByLocal(botId);
    if (!bot || bot.botStatus !== BotStatus.Ready) return [];
    const contactList = await bot.getAllContact();
    return Promise.all(contactList.map(async (contact) => prisma.botContact.create({ data: { ...contact, botId } })));
  }

  async getBotRooms(botId: string): Promise<BotRoom[]> {
    const bot = this.getBotByLocal(botId);
    if (!bot || bot.botStatus !== BotStatus.Ready) return [];
    const roomList = await bot.getAllRoom();
    const res: BotRoom[] = [];
    for (const { id: roomId, topic, announce, alias, member } of roomList) {
      res.push(
        await prisma.botRoom.create({
          data: {
            id: roomId,
            topic,
            announce,
            alias,
            botId,
          },
        })
      );
      await prisma.botContact.createMany({
        data: member.map((contact) => ({ ...contact, botId })),
        skipDuplicates: true,
      });
    }
    return res;
  }
}
