import { Arg, Mutation, Query } from 'type-graphql';
import { Service } from 'typedi';
import { BotContactInfo, BotModel, BotRoomInfo } from '../../models/bot';
import { BotService } from './bot.service';

@Service()
export class BotResolver {
  constructor(private botService: BotService) {}

  @Mutation(() => BotModel, { description: '创建机器人' })
  createBot() {
    return this.botService.createBot();
  }

  @Query(() => [BotContactInfo], { description: '机器人的联系人信息' })
  async botContacts(@Arg('id') id: string) {
    const bot = this.botService.getBot(id);
    if (!bot) return [];
    await bot.waitingReady();
    return bot.ctx.contactInfoList;
  }

  @Query(() => [BotRoomInfo], { description: '机器人的所有群信息' })
  async botRooms(@Arg('id') id: string) {
    const bot = this.botService.getBot(id);
    if (!bot) return [];
    await bot.waitingReady();
    return bot.ctx.roomInfoList;
  }
}
