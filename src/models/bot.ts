import { BotContactGender, BotContactType } from '@prisma/client';
import { Field, ObjectType, registerEnumType } from 'type-graphql';

registerEnumType(BotContactGender, {
  name: 'BotContactGender',
  description: '性别',
  valuesConfig: {
    Unknown: { description: '未知' },
    Male: { description: '男' },
    Female: { description: '女' },
  },
});

registerEnumType(BotContactType, {
  name: 'BotContactType',
  description: '账号类型',
  valuesConfig: {
    Unknown: { description: '未知' },
    Individual: { description: '个人' },
    Official: { description: '公众号' },
    Corporation: { description: '团体' },
  },
});

@ObjectType({ description: '机器人模型' })
export class Bot {
  @Field({ description: '机器人实例id' })
  id!: string;

  @Field(() => String, { description: '机器人账号名称', nullable: true })
  name?: string | null;

  @Field(() => String, { description: '登录的二维码', nullable: true })
  scanQrcode?: string | null;

  @Field({ description: '创建时间' })
  createdAt!: Date;

  @Field({ description: '更新时间' })
  updatedAt!: Date;

  @Field({ description: '用户ID' })
  userId!: string;
}

@ObjectType({ description: '机器人联系人模型' })
export class BotContact {
  @Field({ description: '联系人id' })
  id!: string;

  @Field({ description: '联系人名称' })
  name!: string;

  @Field(() => BotContactGender, { description: '性别' })
  gender!: BotContactGender;

  @Field(() => String, { description: '别名(备注)', nullable: true })
  alias?: string | null;

  @Field(() => String, { description: '地址', nullable: true })
  address?: string | null;

  @Field(() => BotContactType, { description: '个人/公众号' })
  type!: BotContactType;

  @Field({ description: '创建时间' })
  createdAt!: Date;

  @Field({ description: '更新时间' })
  updatedAt!: Date;

  @Field({ description: '机器人实例id' })
  botId!: string;
}

@ObjectType({ description: '机器人群模型' })
export class BotRoom {
  @Field({ description: '群id' })
  id!: string;

  @Field({ description: '群名称' })
  topic!: string;

  @Field(() => String, { description: '群公告', nullable: true })
  announce?: string | null;

  @Field(() => String, { description: '机器人在群中的别名', nullable: true })
  alias?: string | null;

  @Field({ description: '创建时间' })
  createdAt!: Date;

  @Field({ description: '更新时间' })
  updatedAt!: Date;

  @Field({ description: '机器人实例id' })
  botId!: string;
}

@ObjectType({ description: '机器人消息模型' })
export class BotMessage {
  @Field({ description: '消息id' })
  id!: string;

  @Field({ description: '消息内容' })
  content!: string;

  @Field(() => String, { description: '消息来源', nullable: true })
  botContactId?: string;

  @Field({ description: '消息发送时间' })
  date!: Date;

  @Field({ description: '创建时间' })
  createdAt!: Date;
}
