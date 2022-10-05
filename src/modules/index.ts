import { NonEmptyArray } from 'type-graphql';
import { AuthResolver } from './auth/auth.resolver';
import { AutoReplyResolver } from './autoReply/autoReply.resolver';
import { BotResolver } from './bot/bot.resolver';
import { FileResolver } from './file/file.resolver';
import { UserResolver } from './user/user.resolver';

const resolvers: NonEmptyArray<Function> = [AuthResolver, UserResolver, FileResolver, BotResolver, AutoReplyResolver];

export default resolvers;
