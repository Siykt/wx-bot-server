import { UserRoleType } from '@prisma/client';
import { intersection } from 'lodash';
import { AuthChecker } from 'type-graphql';
import { ContextType, UserWithRoles } from './context';

export const authChecker: AuthChecker<ContextType, UserRoleType> = async (resolverData, roles) => {
  const { user } = resolverData.context;
  if (!user) return false;
  if (!roles.length) {
    return true;
  } else {
    return checkRoles(user, roles);
  }
};

export function checkRoles(user: UserWithRoles, roles: UserRoleType[]) {
  const userRoles = user.userRoles.map((role) => role.type);
  if (intersection(userRoles, roles).length) {
    return true;
  }
  return false;
}
