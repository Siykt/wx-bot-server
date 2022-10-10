import { TriggerType, TriggerRate, TriggerPeriod, TriggeredObjectType } from '@prisma/client';
import GraphQLJSON from 'graphql-type-json';
import { nanoid } from 'nanoid';
import {
  Arg,
  Authorized,
  Field,
  FieldResolver,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
} from 'type-graphql';
import { Service } from 'typedi';
import { NotfoundError } from '../../common/errors';
import prisma from '../../common/prisma';
import { AutoReplyConfig, AutoReplyTriggerLog } from '../../models/autoReply';
import { PagedResult, PaginationInput } from '../../models/base';
import { AutoReplyService } from './autoReply.service';

@ObjectType()
class PagedAutoReplyConfig extends PagedResult(AutoReplyConfig) {}

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

  @Field(() => TriggerType, { nullable: true, description: '触发类型' })
  triggerType?: TriggerType | null;

  @Field(() => TriggerRate, { nullable: true, description: '触发频率' })
  triggerRate?: TriggerRate | null;

  @Field(() => TriggerPeriod, { nullable: true, description: '触发周期' })
  triggerPeriod?: TriggerPeriod | null;

  @Field(() => GraphQLJSON, {
    description: '表达式, Auto为{name: string | RegExp} / {alias: string | RegExp}; Event为 "JSONLogic"',
  })
  triggerExpr!: any;

  @Field(() => GraphQLJSON, {
    description: '指定的触发对象 {name: string | RegExp} / {alias: string | RegExp}',
    nullable: true,
  })
  triggeredObject?: any;

  @Field(() => TriggeredObjectType, { description: '触发对象类型', nullable: true })
  triggeredObjectType?: TriggeredObjectType | null;

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

  @Authorized()
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

  @Authorized()
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
    await this.autoReplyService.createJob(config);
    return config;
  }

  @Query(() => PagedAutoReplyConfig, { description: '自动化配置列表' })
  async autoStartConfigList(
    @Arg('botId') botId: string,
    @Arg('name', { description: '自动化脚本名称', nullable: true }) name?: string,
    @Arg('triggerType', () => TriggerType, { description: '触发类型', nullable: true }) triggerType?: TriggerType,
    @Arg('triggerRate', () => TriggerRate, { description: '触发频率', nullable: true }) triggerRate?: TriggerRate,
    @Arg('triggerPeriod', () => TriggerPeriod, { description: '触发周期', nullable: true })
    triggerPeriod?: TriggerPeriod,
    @Arg('pagination', { nullable: true }) pagination?: PaginationInput,
    @Arg('sort', { description: '排序字段，格式为“字段:asc|desc”', nullable: true }) sort?: string
  ): Promise<PagedAutoReplyConfig> {
    const [sortKey, sortType] = sort?.split(':') ?? ['updatedAt', 'desc'];
    const sorts = [{ [sortKey]: sortType }];
    const { size = 10, page = 1 } = pagination ?? {};
    const count = await prisma.autoReplyConfig.count({
      where: { botId, name, triggerType, triggerRate, triggerPeriod },
    });
    const data = await prisma.autoReplyConfig.findMany({
      where: { botId, name, triggerType, triggerRate, triggerPeriod },
      take: size,
      skip: (page - 1) * size,
      orderBy: sorts,
    });
    return { data, count, page, size };
  }

  @FieldResolver(() => [AutoReplyTriggerLog], { description: '运行日志' })
  async triggerLog(@Root() root: AutoReplyConfig) {
    const logs = await prisma.autoReplyTriggerLog.findMany({ where: { autoReplyConfigId: root.id } });
    return logs;
  }
}
