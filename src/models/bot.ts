import { Field, ObjectType } from 'type-graphql';

@ObjectType({ description: '机器人模型' })
export class BotModel {
  @Field({ description: '机器人实例id' })
  id!: string;

  @Field({ description: '登录二维码' })
  scanQrcode!: string;
}

@ObjectType({ description: '机器人联系人模型' })
export class BotContactInfo {
  @Field({ description: '联系人id' })
  id!: string;

  @Field({ description: '联系人名称' })
  name!: string;

  @Field({ description: '性别' })
  gender!: string;

  @Field({ description: '别名(备注)', nullable: true })
  alias?: string;

  @Field({ description: '是否为好友' })
  isFriend!: boolean;

  @Field({ description: '是否为常用联系人', nullable: true })
  star?: boolean;

  @Field({ description: '个人/公众号' })
  type!: string;

  @Field({ description: '省' })
  province!: string;

  @Field({ description: '市' })
  city!: string;

  @Field({ description: '地址' })
  address!: string;
}

@ObjectType({ description: '机器人群信息' })
export class BotRoomInfo {
  @Field({ description: '群id' })
  id!: string;

  @Field({ description: '群名称' })
  topic!: string;

  @Field({ description: '群公共' })
  announce!: string;

  @Field({ description: '机器人在群中的别名' })
  alias!: string;

  @Field(() => [BotContactInfo], { description: '群成员' })
  member!: BotContactInfo[];
}

@ObjectType({ description: '机器人消息模型' })
export class BotMessageInfo {
  @Field({ description: '消息id' })
  id!: string;

  @Field(() => BotContactInfo, { description: '消息来源', nullable: true })
  form?: BotContactInfo | null;

  @Field({ description: '消息内容' })
  content!: string;

  @Field({ description: '消息发送时间' })
  date!: Date;
}