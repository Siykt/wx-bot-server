/** 排除模块类型 */
export type OmitModel<M, K extends string = ''> = Omit<M, ('createdAt' | 'updatedAt') | K>;
