import { nanoid } from 'nanoid';
import { Service } from 'typedi';
import prisma from '../../common/prisma';
import { BotContact, BotRoom } from '../../models/bot';
import Bot, { BotStatus } from './bot.class';

@Service()
export class BotService {
  async createBotByLocal(...args: ConstructorParameters<typeof Bot>) {
    const bot = new Bot(...args);
    const newBot = await prisma.bot.create({
      data: {
        id: nanoid(),
        name: bot.ctx.botUserinfo.name,
        scanQrcode: await bot.asyncGetScanQrcode(),
        userId: (await prisma.user.findFirst({ where: { username: 'admin' } }))!.id,
      },
    });
    Bot.setBot(newBot.id, bot);
    return newBot;
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
    return Promise.all(
      roomList.map(async (room) => prisma.botRoom.create({ data: { ...room, id: nanoid(), botId: id } }))
    );
  }
}
