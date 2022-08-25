import { NonEmptyArray } from 'type-graphql';
import { FileResolver } from './file/file.resolver';
import { UserResolver } from './user/user.resolver';

const resolvers: NonEmptyArray<Function> = [UserResolver, FileResolver];

export default resolvers;
