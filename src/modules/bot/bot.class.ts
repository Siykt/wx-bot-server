import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { ScanStatus, WechatyBuilder } from 'wechaty';
import { ContactSelfInterface, WechatyInterface } from 'wechaty/impls';
import { wait } from '../../common/async';
import logger from '../../common/logger';
import { STORAGE_PATH } from '../../config';

export interface BotContext {
  scanQrcode: string;
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

export default class Bot {
  bot: WechatyInterface;
  botStatus: BotStatus = 0;
  ctx: BotContext = {} as BotContext;
  user?: ContactSelfInterface;

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

  async start() {
    this.bot.on('scan', this.handleScan.bind(this));
    this.bot.on('login', this.handleLogin.bind(this));
    this.bot.on('ready', this.handleReady.bind(this));
    await this.bot.start();
  }

  private async handleScan(qrcode: string, status: ScanStatus) {
    logger.info(`bot-${this.bot.id} 最新扫码状态: ${status}`);
    if (status === ScanStatus.Waiting || status === ScanStatus.Cancel) {
      fs.mkdirSync(STORAGE_PATH, { recursive: true });
      const key = (this.bot.id || `qrcode-${Date.now()}`) + '.png';
      await QRCode.toFile(path.resolve(STORAGE_PATH, key), qrcode);
      // ? 需要考虑是否写入数据库
      this.ctx.scanQrcode = `/files/static/${key}`;
      this.botStatus = BotStatus.WaitingScan;
    }
  }
  private async handleLogin(user: ContactSelfInterface) {
    this.user = user;
    logger.info(`bot-${this.bot.id} 已有用户加入: ${user.name()}`);
  }
  private async handleReady() {
    logger.info(`bot-${this.bot.id} 已经准备就绪!`);
    botMap.set(this.bot.id, this);
    this.botStatus = BotStatus.Ready;
  }

  async asyncGetScanQrcode(): Promise<string> {
    if (this.botStatus === BotStatus.WaitingScan) {
      return this.ctx.scanQrcode;
    }
    // 可能存在 bot 登录缓存
    if (this.botStatus === BotStatus.Ready) {
      logger.info(`改 bot-${this.bot.id} 已在Ready状态!`);
      return this.ctx.scanQrcode ?? '';
    }

    await wait(300);
    return this.asyncGetScanQrcode();
  }
}
