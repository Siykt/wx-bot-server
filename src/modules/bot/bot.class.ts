import { BotContactGender, BotContactType } from '@prisma/client';
import fs from 'fs';
import { curry, map } from 'lodash';
import path from 'path';
import QRCode from 'qrcode';
import { ScanStatus, WechatyBuilder } from 'wechaty';
import { types as PuppetTypes } from 'wechaty-puppet';
import {
  ContactInterface,
  ContactSelfInterface,
  MessageInterface,
  RoomInterface,
  WechatyInterface,
} from 'wechaty/impls';
import { wait } from '../../common/async';
import logger from '../../common/logger';
import { APP_HOST, STORAGE_PATH } from '../../config';
import { BotContact, BotMessage, BotRoom } from '../../models/bot';

type OmitModel<M, K extends string = ''> = Omit<M, ('createdAt' | 'updatedAt') | K>;

export type BotContactInfo = OmitModel<BotContact, 'botId'>;

export interface BotRoomInfo extends OmitModel<BotRoom> {
  member: BotContactInfo[];
}

export interface BotMessageInfo extends OmitModel<BotMessage> {
  form?: BotContactInfo;
}

export interface BotContext {
  /** 扫码QRCord */
  scanQrcode: string;
  /** User实例 */
  botUser: ContactSelfInterface;
  /** 机器人用户的信息 */
  botUserinfo: BotContactInfo;
  /** 文件中转站 */
  fileHelper?: ContactInterface;
  // /** 联系人列表 */
  // contactList: ContactInterface[];
  // /** 联系人信息列表 */
  // contactInfoList: BotContactInfo[];
  // /** 群列表 */
  // roomList: RoomInterface[];
  // /** 群信息列表 */
  // roomInfoList: BotRoomInfo[];
}

export enum BotStatus {
  /** 未初始化 */
  Uninitialized = 0,
  /** 等待扫码 */
  WaitingScan,
  /** 已有用户就绪 */
  Ready,
  /** 已暂停 */
  Stopped,
}

// TODO 实例缓存
const botMap = new Map<string, Bot>();
export const BotMessageType = PuppetTypes.Message;

export interface BotMessageHandlerAdapter {
  // 默认处理器
  (this: Bot, messageInfo: BotMessageInfo, messageInstance: MessageInterface, type: PuppetTypes.Message): unknown;
}

export type MessageHandlerAdapters = Map<
  string,
  [PuppetTypes.Message[] | PuppetTypes.Message, BotMessageHandlerAdapter]
>;

export default class Bot {
  name: string;
  bot: WechatyInterface;
  botStatus: BotStatus = 0;
  ctx: BotContext = {} as BotContext;
  messageHandlerAdapters: MessageHandlerAdapters = new Map();
  onReady: () => unknown = () => {};
  /**
   * @param name 机器人ID, 会作为缓存保留
   * @param manual 手动启动机器人
   */
  constructor(name = 'wx-bot', manual = false) {
    this.bot = WechatyBuilder.build({
      name,
      puppetOptions: {
        uos: true,
      },
      puppet: 'wechaty-puppet-wechat',
    });
    this.name = name;
    if (!manual) {
      this.start();
    }
  }

  static getBot(id: string) {
    return botMap.get(id);
  }

  static setBot(id: string, bot: Bot) {
    return botMap.set(id, bot);
  }

  static getContactGender(gender: PuppetTypes.ContactGender): BotContactGender {
    return (['Unknown', 'Male', 'Female'] as BotContactGender[])[gender] ?? BotContactGender.Unknown;
  }

  static getContactType(type: PuppetTypes.Contact): BotContactType {
    return (['Unknown', 'Individual', 'Official', 'Corporation'] as BotContactType[])[type] ?? BotContactType.Unknown;
  }

  static async getContactInfo(contact: ContactInterface): Promise<BotContactInfo> {
    const province = contact.province() ?? '';
    const city = contact.city() ?? '';
    const address = province + city;
    return {
      name: contact.name(),
      id: contact.id,
      gender: Bot.getContactGender(contact.gender()),
      alias: await contact.alias(),
      type: Bot.getContactType(contact.type()),
      address,
    };
  }

  static async getRoomInfo(contactSelf: ContactSelfInterface, room: RoomInterface): Promise<BotRoomInfo> {
    return {
      id: room.id,
      topic: await room.topic(),
      alias: (await room.alias(contactSelf)) ?? contactSelf.name(),
      announce: await room.announce(),
      member: await Promise.all(map(await room.memberAll(), Bot.getContactInfo)),
    };
  }

  static async formatMessage(message: MessageInterface): Promise<BotMessageInfo> {
    const form = await Bot.getContactInfo(message.talker());
    return {
      id: message.id,
      date: message.date(),
      content: ((await message.toSayable()) as unknown as string) ?? '',
      form: await Bot.getContactInfo(message.talker()),
      botContactId: form?.id,
    };
  }

  get id() {
    return this.bot.id;
  }
  get isReady() {
    return this.botStatus === BotStatus.Ready;
  }

  async start() {
    this.bot.on('scan', this.handleScan.bind(this));
    this.bot.on('login', this.handleLogin.bind(this));
    this.bot.on('ready', this.handleReady.bind(this));
    this.bot.on('message', this.handleMessage.bind(this));
    await this.bot.start();
  }

  private async handleScan(qrcode: string, status: ScanStatus) {
    logger.info(`bot-${this.bot.id} 最新扫码状态: ${status}`);
    if (status === ScanStatus.Waiting || status === ScanStatus.Cancel) {
      fs.mkdirSync(STORAGE_PATH, { recursive: true });
      const key = (this.bot.id || `qrcode-${Date.now()}`) + '.png';
      await QRCode.toFile(path.resolve(STORAGE_PATH, key), qrcode);
      // ? 需要考虑是否写入数据库
      this.ctx.scanQrcode = `${APP_HOST}/files/static/${key}`;
      this.botStatus = BotStatus.WaitingScan;
      logger.info(`bot-${this.bot.id} 登录二维码链接: ${this.ctx.scanQrcode}`);
    }
  }
  private async handleLogin(user: ContactSelfInterface) {
    this.ctx.botUser = user;
    this.ctx.botUserinfo = await Bot.getContactInfo(this.ctx.botUser);
    logger.info(`bot-${this.bot.id} 已有用户加入: ${user.name()}`);
  }
  private async handleReady() {
    this.ctx.fileHelper = await this.bot.Contact.find({ name: '文件传输助手' });
    logger.info(`bot-${this.bot.id} 已经准备就绪!`);
    this.botStatus = BotStatus.Ready;
    this.onReady();
  }
  private async handleMessage(message: MessageInterface) {
    // ? 跳过自己发送的消息
    if (message.self()) {
      return;
    }
    const type = message.type();
    console.log('message ->', await Bot.formatMessage(message));
    for (let [id, [types, handler]] of this.messageHandlerAdapters) {
      types = Array.isArray(types) ? types : [types];
      console.log(types, type, !types.includes(type));
      if (!types.includes(type)) continue;
      try {
        await handler.call(this, await Bot.formatMessage(message), message, type);
        logger.info(`bot-${this.bot.id}: task-${id} success`);
      } catch (error) {
        logger.error(`bot-${this.bot.id} [${type}]: ${error}`);
      }
    }
  }

  async asyncGetScanQrcode(): Promise<string> {
    if (this.botStatus === BotStatus.WaitingScan) {
      return this.ctx.scanQrcode;
    }
    // 可能存在 bot 登录缓存
    if (this.isReady) {
      logger.info(`该bot [bot-${this.bot.id}] 已在Ready状态!`);
      return this.ctx.scanQrcode ?? '';
    }

    await wait(300);
    return this.asyncGetScanQrcode();
  }

  async waitingReady() {
    if (this.isReady) {
      return;
    }
    await wait(1000);
    await this.waitingReady();
  }

  async getAllContact() {
    const contactList = await this.bot.Contact.findAll();
    return Promise.all(map(contactList, Bot.getContactInfo));
  }

  async getAllRoom() {
    const roomList = await this.bot.Room.findAll();
    return Promise.all(map(roomList, curry(Bot.getRoomInfo)(this.ctx.botUser)));
  }

  addMessageHandler(
    handleId: string,
    typeOrTypes: PuppetTypes.Message[] | PuppetTypes.Message,
    handle: BotMessageHandlerAdapter
  ) {
    // TODO 可以额外封装一下, 比如将保存消息模块放在这里
    return this.messageHandlerAdapters.set(handleId, [typeOrTypes, handle]);
  }
}
