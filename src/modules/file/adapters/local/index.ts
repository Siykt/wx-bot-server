import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { STORAGE_PATH } from '../../../../config';

async function upload(key: string, inputStream: Readable) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true });
  const stream = fs.createWriteStream(path.resolve(STORAGE_PATH, key));
  fs.mkdirSync(path.resolve(STORAGE_PATH, path.dirname(key)), { recursive: true });
  inputStream.pipe(stream);
  return `/files/${key}`;
}

export default upload;
