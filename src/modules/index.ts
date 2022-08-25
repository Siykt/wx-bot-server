import { NonEmptyArray } from 'type-graphql';
import { BotResolver } from './bot/bot.resolver';
import { FileResolver } from './file/file.resolver';
import { UserResolver } from './user/user.resolver';

const resolvers: NonEmptyArray<Function> = [UserResolver, FileResolver, BotResolver];

export default resolvers;
