import { ClassType, Field, InputType, Int, ObjectType } from 'type-graphql';

@InputType({ description: '分页查询条件' })
export class PaginationInput {
  @Field({ description: '页码', nullable: true })
  page: number = 1;

  @Field({ description: '每页大小', nullable: true })
  size: number = 10;
}

export interface PagedResultType<T> {
  data: T[];
  page: number;
  size: number;
  count: number;
}

export interface OffsetResultType<T> {
  data: T[];
  offset: number;
  size: number;
  count: number;
}

export function PagedResult<T>(itemClass: ClassType<T>) {
  @ObjectType({ isAbstract: true })
  abstract class PagedResultClass implements PagedResultType<T> {
    @Field(() => [itemClass])
    data: T[] = [];

    @Field(() => Int)
    page: number = 1;

    @Field(() => Int)
    size: number = 10;

    @Field(() => Int)
    count: number = 0;
  }
  return PagedResultClass;
}

export function OffsetResult<T>(itemClass: ClassType<T>) {
  @ObjectType({ isAbstract: true })
  abstract class OffsetResultClass implements OffsetResultType<T> {
    @Field(() => [itemClass])
    data: T[] = [];

    @Field(() => Int)
    offset: number = 0;

    @Field(() => Int)
    size: number = 10;

    @Field(() => Int)
    count: number = 0;
  }
  return OffsetResultClass;
}
