import { NonEmptyArray } from 'type-graphql';
import { UserResolver } from './user/user.resolver';

const resolvers: NonEmptyArray<Function> = [UserResolver];

export default resolvers;
