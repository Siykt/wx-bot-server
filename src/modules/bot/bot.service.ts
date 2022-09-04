import { nanoid } from 'nanoid';
import { Service } from 'typedi';
import prisma from '../../common/prisma';
import { BotContact, BotRoom } from '../../models/bot';
import Bot, { BotStatus } from './bot.class';

@Service()
export class BotService {
  async createBotByLocal(id: string, name?: string) {
    const bot = new Bot(name, false);
    await bot.start();
    Bot.setBot(id, bot);
    return bot;
  }

  getBotByLocal(id: string) {
    return Bot.getBot(id);
  }

  async getBotContacts(id: string): Promise<BotContact[]> {
    const bot = this.getBotByLocal(id);
    if (!bot || bot.botStatus !== BotStatus.Ready) return [];
    const contactList = await bot.getAllContact();
    return Promise.all(
      contactList.map(async (contact) => prisma.botContact.create({ data: { ...contact, id: nanoid(), botId: id } }))
    );
  }

  async getBotRooms(id: string): Promise<BotRoom[]> {
    const bot = this.getBotByLocal(id);
    if (!bot || bot.botStatus !== BotStatus.Ready) return [];
    const roomList = await bot.getAllRoom();
    const res: BotRoom[] = [];
    for (const { topic, announce, alias, member } of roomList) {
      res.push(
        await prisma.botRoom.create({
          data: {
            id: nanoid(),
            topic,
            announce,
            alias,
            botId: id,
          },
        })
      );
      await Promise.all(
        member.map(async (contact) => prisma.botContact.create({ data: { ...contact, id: nanoid(), botId: id } }))
      );
    }
    return res;
  }
}
