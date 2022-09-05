import { nanoid } from 'nanoid';
import { Arg, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { Service } from 'typedi';
import prisma from '../../common/prisma';
import { Bot, BotContact, BotRoom } from '../../models/bot';
import { BotService } from './bot.service';

@Service()
@Resolver(Bot)
export class BotResolver {
  constructor(private botService: BotService) {}

  @Mutation(() => Bot, { description: '启动/创建机器人' })
  async startBot(@Arg('id', { nullable: true }) id?: string, @Arg('name', { nullable: true }) name?: string) {
    let bot: Bot | null = null;
    if (id) {
      bot = await this.bot(id);
    }
    if (!bot) {
      bot = await prisma.bot.create({
        data: {
          id: nanoid(),
          userId: (await prisma.user.findFirst({ where: { username: 'admin' } }))!.id,
        },
      });
    }
    const botInstance = await this.botService.createBotByLocal(bot.id, name);
    bot.scanQrcode = await botInstance.asyncGetScanQrcode();
    botInstance.onReady = () => {
      prisma.bot.update({
        where: { id: bot!.id },
        data: { ...bot, name: botInstance.ctx.botUserinfo.name },
      });
    };
    return bot;
  }

  @Query(() => Bot, { description: '获取机器人', nullable: true })
  bot(@Arg('id') id: string) {
    return prisma.bot.findUnique({ where: { id } });
  }

  @FieldResolver(() => Number, { description: '获取机器人状态' })
  botStatus(@Root() root: Bot) {
    const bot = this.botService.getBotByLocal(root.id);
    if (!bot) return 0;
    return bot.botStatus;
  }

  @FieldResolver(() => [BotContact], { description: '机器人的联系人信息' })
  async botContacts(
    @Root() root: Bot,
    @Arg('refresh', { nullable: true }) refresh: boolean = false
  ): Promise<BotContact[]> {
    const res = await prisma.botContact.findMany({
      where: {
        bot: {
          BotsOnContacts: {
            some: { bot: root },
          },
        },
      },
    });
    if (res.length) return res;
    if (!refresh) return [];
    return this.botService.getBotContacts(root.id);
  }

  @FieldResolver(() => [BotRoom], { description: '机器人的所有群信息' })
  async botRooms(@Root() root: Bot, @Arg('refresh', { nullable: true }) refresh: boolean = false): Promise<BotRoom[]> {
    const res = await prisma.botRoom.findMany({
      where: {
        BotsOnRooms: {
          some: { bot: root },
        },
      },
    });
    if (res.length) return res;
    if (!refresh) return [];
    return this.botService.getBotRooms(root.id);
  }
}
