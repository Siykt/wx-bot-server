import { BotsOnContacts, BotsOnRooms } from '@prisma/client';
import { Service } from 'typedi';
import prisma from '../../common/prisma';
import { BotContact, BotRoom } from '../../models/bot';
import { OmitModel } from '../../types/utils.t';
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

    const botContacts: OmitModel<BotContact>[] = [];
    const botsOnContacts: OmitModel<BotsOnContacts>[] = [];

    for (const contact of contactList) {
      botContacts.push({ ...contact, botId });
      botsOnContacts.push({ botId, botContactid: contact.id });
    }

    await prisma.botContact.createMany({
      data: botContacts,
      skipDuplicates: true,
    });
    await prisma.botsOnContacts.createMany({
      data: botsOnContacts,
      skipDuplicates: true,
    });
    return prisma.botContact.findMany({
      where: {
        bot: {
          BotsOnContacts: {
            some: { bot: { id: botId } },
          },
        },
      },
    });
  }

  async getBotRooms(botId: string): Promise<BotRoom[]> {
    const bot = this.getBotByLocal(botId);
    if (!bot || bot.botStatus !== BotStatus.Ready) return [];

    const roomList = await bot.getAllRoom();

    const botRooms: OmitModel<BotRoom>[] = [];
    const botContacts: OmitModel<BotContact>[] = [];
    const botsOnContacts: OmitModel<BotsOnContacts>[] = [];
    const botsOnRooms: OmitModel<BotsOnRooms>[] = [];

    for (const { id: botRoomId, topic, announce, alias, member } of roomList) {
      botRooms.push({ id: botRoomId, botId, topic, announce, alias });
      botsOnRooms.push({ botId, botRoomId });
      for (const contact of member) {
        botContacts.push({ ...contact, botId });
        botsOnContacts.push({ botId, botContactid: contact.id });
      }
    }

    await prisma.botRoom.createMany({
      data: botRooms,
      skipDuplicates: true,
    });
    await prisma.botContact.createMany({
      data: botContacts,
      skipDuplicates: true,
    });
    await prisma.botsOnRooms.createMany({
      data: botsOnRooms,
      skipDuplicates: true,
    });
    await prisma.botsOnContacts.createMany({
      data: botsOnContacts,
      skipDuplicates: true,
    });

    return prisma.botRoom.findMany({
      where: {
        bot: {
          BotsOnContacts: {
            some: { bot: { id: botId } },
          },
        },
      },
    });
  }
}
