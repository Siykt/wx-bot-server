import { User } from '@prisma/client';
import { NotFoundError } from '@prisma/client/runtime';
import { nanoid } from 'nanoid';
import { Arg, Authorized, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { Service } from 'typedi';
import { CurrentUser } from '../../common/decorators/currentUser';
import prisma from '../../common/prisma';
import { Bot, BotContact, BotRoom } from '../../models/bot';
import { BotService } from './bot.service';

@Service()
@Resolver(Bot)
export class BotResolver {
  constructor(private botService: BotService) {}

  @Authorized()
  @Mutation(() => Bot, { description: '启动/创建机器人' })
  async startBot(
    @CurrentUser() user: User,
    @Arg('id', { nullable: true }) id?: string,
    @Arg('name', { nullable: true }) name?: string
  ) {
    let bot: Bot | null = null;
    if (id) {
      bot = await this.bot(id);
      if (!bot) throw new NotFoundError('无法获取该机器人!');
    } else {
      bot = await prisma.bot.create({
        data: {
          id: nanoid(),
          userId: user.id,
        },
      });
    }
    let botInstance = this.botService.getBotByLocal(bot.id);
    if (!botInstance) {
      botInstance = await this.botService.createBotByLocal(bot.id, name);
    }
    const botId = bot.id;
    botInstance.on('ready', {
      handleId: 'updateBotInfo',
      handle: async () => {
        console.log('update bot');
        await prisma.bot.update({
          where: { id: botId },
          data: { name },
        });
      },
    });
    bot.scanQrcode = await botInstance.asyncGetScanQrcode();
    return bot;
  }

  @Query(() => Bot, { description: '获取机器人', nullable: true })
  bot(@Arg('id') id: string) {
    return prisma.bot.findUnique({ where: { id } });
  }

  @Authorized()
  @Query(() => Bot, { description: '获取自己的机器人(单机器人模型)', nullable: true })
  async myselfBot(@CurrentUser() user: User) {
    const bot = await prisma.bot.findFirst({ where: { userId: user.id } });
    if (!bot) throw new NotFoundError('暂无机器人, 请先尝试创建!');
    return bot;
  }

  @FieldResolver(() => Number, { description: '获取机器人状态' })
  botStatus(@Root() root: Bot) {
    const bot = this.botService.getBotByLocal(root.id);
    // 未初始化
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
