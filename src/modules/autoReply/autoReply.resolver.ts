import { TriggerType, TriggerRate, TriggerPeriod } from '@prisma/client';
import GraphQLJSON from 'graphql-type-json';
import { nanoid } from 'nanoid';
import { Arg, Field, FieldResolver, InputType, Mutation, Query, Resolver, Root } from 'type-graphql';
import { Service } from 'typedi';
import prisma from '../../common/prisma';
import { AutoReplyConfig, AutoReplyTriggerLog } from '../../models/autoReply';
import { AutoReplyService } from './autoReply.service';

@InputType()
class AutoReplyConfigInput {
  @Field({ nullable: true })
  id?: string;

  @Field()
  name!: string;

  @Field()
  content!: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field()
  priority!: number;

  @Field(() => TriggerType)
  triggerType!: TriggerType;

  @Field(() => TriggerRate)
  triggerRate!: TriggerRate;

  @Field(() => TriggerPeriod, { nullable: true })
  triggerPeriod?: TriggerPeriod | null;

  @Field(() => GraphQLJSON)
  triggerExpr!: any;

  @Field()
  botId!: string;
}

@Service()
@Resolver(AutoReplyConfig)
export class AutoReplyResolver {
  constructor(private autoReplyService: AutoReplyService) {}

  @Query(() => AutoReplyConfig, { description: '自动化配置详情' })
  async autoReplyConfig(@Arg('id') id: string) {
    const config = await prisma.autoReplyConfig.findUnique({ where: { id } });
    return config;
  }

  @Mutation(() => Boolean)
  async removeAutoConfig(@Arg('id') id: string) {
    const config = await prisma.autoReplyConfig.findFirst({ where: { id } });
    if (!config) throw new Error('自动化配置不存在');

    // 定时任务
    if (config.triggerType === TriggerType.Auto) {
      this.autoReplyService.removeCronJob(config);
    }

    // 自动回复
    if (config.triggerType === TriggerType.Event) {
      this.autoReplyService.removeKeywordsReply(config);
    }

    await prisma.autoReplyConfig.delete({ where: { id } });
    return true;
  }

  @Mutation(() => AutoReplyConfig, { description: '创建/更新自动化配置' })
  async saveAutoStartConfig(
    @Arg('input', () => AutoReplyConfigInput) input: AutoReplyConfigInput
  ): Promise<AutoReplyConfig> {
    const bot = await prisma.bot.findUnique({ where: { id: input.botId } });
    if (!bot) throw new Error('机器人不存在!');
    const config = await prisma.autoReplyConfig.upsert({
      where: { id: input.id ?? '' },
      create: { ...input, id: nanoid() },
      update: { ...input },
    });

    // 定时任务
    if (config.triggerType === TriggerType.Auto) {
      this.autoReplyService.createCronJob(config);
    }

    // 自动回复
    if (config.triggerType === TriggerType.Event) {
      this.autoReplyService.createKeywordsReply(config);
    }

    return config;
  }

  @FieldResolver(() => [AutoReplyTriggerLog], { description: '运行日志' })
  async triggerLog(@Root() root: AutoReplyConfig) {
    const logs = await prisma.autoReplyTriggerLog.findMany({ where: { autoReplyConfigId: root.id } });
    return logs;
  }
}
