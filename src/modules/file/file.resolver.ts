import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { Arg, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { nanoid } from 'nanoid';
import path from 'path';
import { FileService } from './file.service';

@Service()
@Resolver()
export class FileResolver {
  constructor(private fileService: FileService) {}

  @Mutation(() => String, { description: '上传文件' })
  async upload(@Arg('file', () => GraphQLUpload) file: FileUpload) {
    if (file instanceof Promise) file = await file;
    const filename = file.filename;
    const extname = path.extname(filename);
    const key = `${Date.now()}-${nanoid(5)}${extname}`;
    return await this.fileService.uploader(key, file.createReadStream());
  }
}
