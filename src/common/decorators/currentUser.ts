import { createParamDecorator } from 'type-graphql';
import { ContextType } from '../context';

export function CurrentUser() {
  return createParamDecorator<ContextType>(({ context }) => context.user);
}

export function CurrentToken() {
  return createParamDecorator<ContextType>(({ context }) => context.token);
}
