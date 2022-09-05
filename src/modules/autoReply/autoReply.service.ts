import { AutoReplyConfig, TriggerPeriod, TriggerRate } from '@prisma/client';
import jsonLogic from 'json-logic-js';
import { nanoid } from 'nanoid';
import Schedule from 'node-schedule';
import { Service } from 'typedi';
import logger from '../../common/logger';
import prisma from '../../common/prisma';
import { BotMessageType } from '../bot/bot.class';
import { BotService } from '../bot/bot.service';

@Service()
export class AutoReplyService {
  constructor(private botService: BotService) {}

  validatedBot(botId: string) {
    const bot = this.botService.getBotByLocal(botId);

    if (!bot) throw new Error('机器人已失效或不存在!');
    if (!bot.isReady) throw new Error('机器人未准备就绪!');

    return bot;
  }

  createKeywordsReply(config: AutoReplyConfig) {
    const bot = this.validatedBot(config.botId);

    bot.addMessageHandler(config.id, [BotMessageType.Text, BotMessageType.Url], async (msg, messageInstance) => {
      /**
       * @example
       *
       * triggerExpr = {
       *  and: [
       *    { '==': [{ var: 'form.name' }, 'AntPro'] },
       *    { '==': [{ var: 'content' }, '测试消息'] }]
       * }
       *
       * 匹配模式参考
       * @see https://jsonlogic.com/
       */
      if (!jsonLogic.apply(config.triggerExpr as any, msg)) return;
      try {
        const recallMsg = await messageInstance.say(config.content);
        try {
          const contact = await prisma.botContact.findUnique({ where: { id: msg.botContactId } });
          // 跳过未保存至数据库的联系人信息
          if (!contact) return;
          await prisma.botMessage.createMany({
            data: [
              // ! 保存触发消息, 尽量仅作为日志留存
              { id: nanoid(), content: msg.content, date: msg.date, botContactId: contact.id },
              // ! 保存发送消息, 尽量仅作为日志留存
              { id: nanoid(), content: config.content, date: new Date(), botContactId: bot.ctx.botUserinfo.id },
            ],
            skipDuplicates: true,
          });
        } catch (error) {
          logger.error(`[saving message error]: ${error}`);
          // ? 发生错误撤回
          await recallMsg?.recall();
        }
      } catch (error) {
        logger.error(`[reply message error]: ${error}`);
      }
    });
  }

  private createJobName(config: AutoReplyConfig) {
    return `${config.name}-${config.botId}-${config.id}`;
  }

  /**
   * 格式化触发时机
   *
   * 解析规则
   * @see https://www.npmjs.com/package/node-schedule
   */
  private formatTriggerPeriod(triggerPeriod: TriggerPeriod, date = new Date()) {
    const s = date.getSeconds();
    const min = date.getMinutes();
    const day = date.getDay();
    const ScheduleTriggerPeriodMap = {
      Minute: `${s} * * * * *`,
      Hour: `${s} ${min} * * * *`,
      Day: `${s} ${min} ${day} * * *`,
      Week: `${s} ${min} ${day} * * 1`,
      Month: `${s} ${min} ${day} 1 * *`,
    };
    return ScheduleTriggerPeriodMap[triggerPeriod];
  }

  async createCronJob(config: AutoReplyConfig) {
    const bot = this.validatedBot(config.botId);
    const jobName = this.createJobName(config);
    const replayContact = await bot.bot.Contact.find(config.triggerExpr as any);

    // ? 可能是无效逻辑
    if (!config.triggerPeriod) return;
    if (!replayContact) throw new Error('无法获取执行自动任务的对象!');

    Schedule.scheduleJob(
      jobName,
      { rule: this.formatTriggerPeriod(config.triggerPeriod), tz: 'Asia/Shanghai' },
      async () => {
        if (config.triggerRate === TriggerRate.Once) {
          if (Schedule.cancelJob(jobName)) {
            logger.info(`[cron-job-${config.id}] 已结束!`);
          } else {
            logger.warn(`[cron-job-${config.id}] 取消失败!`);
          }
        }

        try {
          await replayContact.say(config.content);
          // ! 保存发送消息, 尽量仅作为日志留存
          await prisma.botMessage.create({
            data: {
              id: nanoid(),
              content: config.content,
              date: new Date(),
              botContactId: bot.ctx.botUserinfo.id,
            },
          });
        } catch (error) {
          logger.error(`[cron-job-${config.id}]: ${error}`);
          // ? 发生错误终止任务
          Schedule.cancelJob(jobName);
        }
      }
    );
  }
}