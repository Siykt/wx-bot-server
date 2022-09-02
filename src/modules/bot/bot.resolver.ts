import { Arg, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { Service } from 'typedi';
import prisma from '../../common/prisma';
import { Bot, BotContact, BotRoom } from '../../models/bot';
import { BotService } from './bot.service';

@Service()
@Resolver(Bot)
export class BotResolver {
  constructor(private botService: BotService) {}

  @Mutation(() => Bot, { description: '创建机器人' })
  createBot(@Arg('botId') botId: string) {
    return this.botService.createBotByLocal(botId);
  }

  @Query(() => Bot, { description: '获取机器人', nullable: true })
  async bot(@Arg('id') id: string) {
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
    const res = await prisma.botContact.findMany({ where: { bot: root } });
    if (res.length) return res;
    if (!refresh) return [];
    return this.botService.getBotContacts(root.id);
  }

  @FieldResolver(() => [BotRoom], { description: '机器人的所有群信息' })
  async botRooms(@Root() root: Bot, @Arg('refresh', { nullable: true }) refresh: boolean = false): Promise<BotRoom[]> {
    const res = await prisma.botRoom.findMany({ where: { bot: root } });
    if (res.length) return res;
    if (!refresh) return [];
    return this.botService.getBotRooms(root.id);
  }
}
