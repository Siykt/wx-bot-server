import { TriggerType, TriggerRate, TriggerPeriod } from '@prisma/client';
import GraphQLJSON from 'graphql-type-json';
import { nanoid } from 'nanoid';
import { Arg, Field, FieldResolver, InputType, Mutation, Query, Resolver, Root } from 'type-graphql';
import { Service } from 'typedi';
import { NotfoundError } from '../../common/errors';
import prisma from '../../common/prisma';
import { AutoReplyConfig, AutoReplyTriggerLog } from '../../models/autoReply';
import { AutoReplyService } from './autoReply.service';

@InputType()
class AutoReplyConfigInput {
  @Field({ nullable: true })
  id?: string;

  @Field({ description: '自动化脚本名称' })
  name!: string;

  @Field({ description: '自动回复内容' })
  content!: string;

  @Field(() => String, { nullable: true, description: '自动化脚本描述' })
  description?: string;

  @Field({ description: '优先级' })
  priority!: number;

  @Field(() => TriggerType, { description: '触发类型' })
  triggerType!: TriggerType;

  @Field(() => TriggerRate, { description: '触发频率' })
  triggerRate!: TriggerRate;

  @Field(() => TriggerPeriod, { nullable: true, description: '触发周期' })
  triggerPeriod?: TriggerPeriod | null;

  @Field(() => GraphQLJSON, {
    description: '表达式, Auto为{name: string | RegExp} / {alias: string | RegExp}; Event为 "JSONLogic"',
  })
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
    if (!config) throw new NotfoundError('自动化配置不存在');

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
    if (!bot) throw new NotfoundError('机器人不存在!');
    const config = await prisma.autoReplyConfig.upsert({
      where: { id: input.id ?? '' },
      create: { ...input, id: nanoid() },
      update: { ...input },
    });

    // 定时任务
    if (config.triggerType === TriggerType.Auto) {
      await this.autoReplyService.createCronJob(config);
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
