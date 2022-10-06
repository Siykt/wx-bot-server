import { readFileSync } from 'fs';
import Handlebars from 'handlebars';
import path from 'path';

export function renderTemplate(templateName: string, data: object): string {
  const templateDir = path.resolve(__dirname, './templates');
  const template = readFileSync(`${templateDir}/${templateName}.hbs`, 'utf8');
  return Handlebars.compile(template)(data);
}
