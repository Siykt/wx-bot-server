import fs from 'fs';
import { curry, map } from 'lodash';
import { nanoid } from 'nanoid';
import path from 'path';
import QRCode from 'qrcode';
import { Message, ScanStatus, WechatyBuilder } from 'wechaty';
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
import { BotContactInfo, BotMessageInfo, BotRoomInfo } from '../../models/bot';

export interface BotContext {
  /** 扫码QRCord */
  scanQrcode: string;
  /** User实例 */
  botUser: ContactSelfInterface;
  /** 机器人用户的信息 */
  botUserinfo: BotContactInfo;
  /** 文件中转站 */
  fileHelper: ContactInterface;
  /** 联系人列表 */
  contactList: ContactInterface[];
  /** 联系人信息列表 */
  contactInfoList: BotContactInfo[];
  /** 群列表 */
  roomList: RoomInterface[];
  /** 群信息列表 */
  roomInfoList: BotRoomInfo[];
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

export const botMap = new Map<string, Bot>();
export type BotMessageType = ReturnType<Message['type']>;

export interface BotMessageHandlerAdapter {
  // 默认处理器
  (messageInfo: BotMessageInfo): Promise<unknown>;
}

export default class Bot {
  bot: WechatyInterface;
  botStatus: BotStatus = 0;
  ctx: BotContext = {} as BotContext;
  messageHandlerAdapters: Map<BotMessageType, BotMessageHandlerAdapter[]> = new Map();

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
    if (!manual) {
      this.start();
    }
  }

  static getContactGender(gender: PuppetTypes.ContactGender) {
    return ['未知', '男', '女'][gender] ?? '未知';
  }

  static getContactType(type: PuppetTypes.Contact) {
    return ['未知', '个人', '公众号', '组织/企业(企业微信)'][type] ?? '未知';
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
      isFriend: contact.friend() ?? false,
      star: contact.star(),
      type: Bot.getContactType(contact.type()),
      province,
      city,
      address,
    };
  }

  static async getRoomInfo(contactSelf: ContactSelfInterface, room: RoomInterface): Promise<BotRoomInfo> {
    const instance = new BotRoomInfo();
    instance.id = room.id;
    instance.topic = await room.topic();
    instance.alias = (await room.alias(contactSelf)) ?? contactSelf.name();
    instance.announce = await room.announce();
    instance.member = await Promise.all(map(await room.memberAll(), Bot.getContactInfo));
    instance.id;
    return instance;
  }

  static async formatMessage(message: MessageInterface): Promise<BotMessageInfo> {
    const instance = new BotMessageInfo();
    instance.id = nanoid();
    instance.date = message.date();
    instance.content = (message.toSayable() as unknown as string) ?? '';
    const from = message.from();
    instance.form = from ? await Bot.getContactInfo(from) : null;
    return instance;
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
    botMap.set(this.bot.id, this);
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
    this.ctx.fileHelper = (await this.bot.Contact.find({ name: '文件传输助手' })) as ContactInterface;
    this.ctx.contactList = await this.bot.Contact.findAll();
    this.ctx.contactInfoList = await Promise.all(map(this.ctx.contactList, Bot.getContactInfo));
    this.ctx.roomList = await this.bot.Room.findAll();
    this.ctx.roomInfoList = await Promise.all(map(this.ctx.roomList, curry(Bot.getRoomInfo)(this.ctx.botUser)));
    logger.info(`bot-${this.bot.id} 已经准备就绪!`);
    this.botStatus = BotStatus.Ready;
  }
  private async handleMessage(message: MessageInterface) {
    // TODO 自己发送的消息
    if (message.self()) {
      return;
    }
    const type = message.type();
    if (!this.messageHandlerAdapters.has(type)) {
      return;
    }
    for (const handler of this.messageHandlerAdapters.get(type) as BotMessageHandlerAdapter[]) {
      try {
        await handler(await Bot.formatMessage(message));
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
}
