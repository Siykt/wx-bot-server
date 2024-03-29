import { ObjectType, Field, registerEnumType } from 'type-graphql';
import { TriggerPeriod, TriggerRate, TriggerType, TriggeredObjectType } from 'prisma/prisma-client';
import GraphQLJSON from 'graphql-type-json';

registerEnumType(TriggerType, {
  name: 'TriggerType',
  description: '触发类型',
  valuesConfig: {
    Auto: { description: '自动触发' },
    Event: { description: '事件触发' },
  },
});

registerEnumType(TriggerRate, {
  name: 'TriggerRate',
  description: '触发频率',
  valuesConfig: {
    Once: { description: '一次' },
    Always: { description: '每次' },
    Custom: { description: '自定义' },
  },
});

registerEnumType(TriggerPeriod, {
  name: 'TriggerPeriod',
  description: '触发周期',
  valuesConfig: {
    Minute: { description: '每分钟' },
    Day: { description: '每天' },
    Week: { description: '每周' },
    Month: { description: '每月' },
  },
});

registerEnumType(TriggeredObjectType, {
  name: 'TriggeredObjectType',
  description: '触发对象类型',
  valuesConfig: {
    Room: { description: '指定群组' },
    From: { description: '消息来源' },
    Contact: { description: '指定联系人' },
  },
});

@ObjectType({ description: '自动化配置模型' })
export class AutoReplyConfig {
  @Field({ description: 'ID' })
  id!: string;

  @Field({ description: '配置名称' })
  name!: string;

  @Field({ description: '需要执行的内容' })
  content!: string;

  @Field(() => String, { description: '配置描述', nullable: true })
  description?: string | null;

  @Field({ description: '优先级' })
  priority!: number;

  @Field(() => TriggerType, { description: '触发类型', nullable: true, defaultValue: TriggerType.Event })
  triggerType?: TriggerType | null;

  @Field(() => TriggerRate, { description: '触发频率', nullable: true, defaultValue: TriggerRate.Always })
  triggerRate?: TriggerRate | null;

  @Field(() => GraphQLJSON, { description: '表达式' })
  triggerExpr!: any;

  @Field(() => TriggerPeriod, { description: '触发周期', nullable: true })
  triggerPeriod?: TriggerPeriod | null;

  @Field(() => GraphQLJSON, { description: '指定的触发对象', nullable: true })
  triggeredObject?: any;

  @Field(() => TriggeredObjectType, { description: '触发对象类型', nullable: true })
  triggeredObjectType?: TriggeredObjectType | null;

  @Field({ description: '创建时间' })
  createdAt!: Date;

  @Field({ description: '更新时间' })
  updatedAt!: Date;

  @Field({ description: '机器人实例id' })
  botId!: string;
}

@ObjectType({ description: '自动化配置日志' })
export class AutoReplyTriggerLog {
  @Field({ description: 'ID' })
  id!: string;

  @Field({ description: '创建时间' })
  createdAt!: Date;

  @Field({ description: '更新时间' })
  updatedAt!: Date;

  @Field({ description: '自动化配置模型' })
  autoReplyConfigId!: string;
}
