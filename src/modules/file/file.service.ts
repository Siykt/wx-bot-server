import { Service } from 'typedi';
import { STORAGE_ADAPTER } from '../../config';
import localUploader from './adapters/local';
import { Readable } from 'stream';

export type UploadAdapter = (key: string, stream: Readable) => Promise<string>;

const adapters = {
  LOCAL: localUploader,
};

@Service()
export class FileService {
  public uploader: UploadAdapter;

  constructor() {
    this.uploader = adapters[STORAGE_ADAPTER?.toUpperCase() as keyof typeof adapters] ?? localUploader;
  }
}
