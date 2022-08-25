import { UserRoleType } from '@prisma/client';
import { Field, ObjectType, registerEnumType } from 'type-graphql';

registerEnumType(UserRoleType, {
  name: 'UserRoleType',
  description: '用户角色',
  valuesConfig: {
    Admin: { description: '管理员' },
    SystemAdmin: { description: '系统管理员' },
  },
});

@ObjectType({ description: '用户模型' })
export class User {
  @Field({ description: 'ID' })
  id!: string;

  @Field(() => String, { description: '手机号', nullable: true })
  mobilePhoneNumber?: string | null;

  @Field({ description: '用户名' })
  username!: string;

  @Field(() => String, { description: '头像', nullable: true })
  avatar?: string | null;

  @Field({ description: '是否验证手机号' })
  mobilePhoneVerified!: boolean;

  @Field(() => String, { description: '昵称', nullable: true })
  nickname?: string | null;

  @Field({ description: '创建时间' })
  createdAt!: Date;

  @Field({ description: '更新时间' })
  updatedAt!: Date;
}
