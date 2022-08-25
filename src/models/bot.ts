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

  @Field({ description: '联系人手机号' })
  phone?: string;
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
