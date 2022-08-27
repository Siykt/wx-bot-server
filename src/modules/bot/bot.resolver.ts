import { Arg, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { Service } from 'typedi';
import { BotContactInfo, BotModel, BotRoomInfo } from '../../models/bot';
import { BotService } from './bot.service';

@Service()
@Resolver(BotModel)
export class BotResolver {
  constructor(private botService: BotService) {}

  @Mutation(() => BotModel, { description: '创建机器人' })
  createBot(@Arg('botId') botId?: string) {
    return this.botService.createBot(botId);
  }

  @Query(() => BotModel, { description: '获取机器人', nullable: true })
  async bot(@Arg('id') id: string) {
    const bot = this.botService.getBot(id);
    if (!bot) return null;
    return {
      id: bot.id,
      scanQrcode: await bot.asyncGetScanQrcode(),
    };
  }

  @FieldResolver(() => [BotContactInfo], { description: '机器人的联系人信息' })
  async botContacts(@Root() root: BotModel): Promise<BotContactInfo[]> {
    const bot = this.botService.getBot(root.id);
    if (!bot) return [];
    await bot.waitingReady();
    return bot.ctx.contactInfoList;
  }

  @FieldResolver(() => [BotRoomInfo], { description: '机器人的所有群信息' })
  async botRooms(@Root() root: BotModel): Promise<BotRoomInfo[]> {
    const bot = this.botService.getBot(root.id);
    if (!bot) return [];
    await bot.waitingReady();
    return bot.ctx.roomInfoList;
  }
}
