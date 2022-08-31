import { BotContactGender, BotContactType } from '@prisma/client';
import { Field, ObjectType } from 'type-graphql';

@ObjectType({ description: '机器人模型' })
export class Bot {
  @Field({ description: '机器人实例id' })
  id!: string;

  @Field({ description: '机器人账号名称' })
  name!: string;

  @Field({ description: '登录的二维码', nullable: true })
  scanQrcode?: string;

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

  @Field({ description: '性别' })
  gender!: BotContactGender;

  @Field(() => String, { description: '别名(备注)', nullable: true })
  alias?: string | null;

  @Field(() => String, { description: '地址', nullable: true })
  address?: string | null;

  @Field({ description: '个人/公众号' })
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
