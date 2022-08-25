import { UserRoleType } from '@prisma/client';
import { Resolver, FieldResolver, Root, Authorized, Query } from 'type-graphql';
import { Service } from 'typedi';
import { User } from '../../models/user';
import prisma from '../../common/prisma';
import { CurrentUser } from '../../common/decorators/currentUser';

@Service()
@Resolver(User)
export class UserResolver {
  @Authorized()
  @Query(() => User, { description: '查询自身' })
  async myself(@CurrentUser() user: User) {
    return user;
  }

  @FieldResolver(() => [UserRoleType], { description: '用户的角色' })
  async roles(@Root() root: User) {
    const roles = await prisma.userRole.findMany({ where: { userId: root.id } });
    return roles.map((role) => role.type);
  }
}
