import { AutoReplyConfig, TriggerPeriod, TriggerRate } from '@prisma/client';
import { Service } from 'typedi';
import logger from '../../common/logger';
import jsonLogic from '../../common/regexExpr';
import { BotMessageType } from '../bot/bot.class';
import { BotService } from '../bot/bot.service';
import prisma from '../../common/prisma';
import { nanoid } from 'nanoid';
import Schedule from 'node-schedule';

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
      if (!jsonLogic.apply(config.triggerExpr as any, msg.content)) return;
      try {
        const recallMsg = await messageInstance.say(config.content);
        try {
          // ! 保存触发消息, 尽量仅作为日志留存
          await prisma.botMessage.create({
            data: {
              id: nanoid(),
              content: msg.content,
              date: msg.date,
              botContactId: msg.botContactId,
            },
          });
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
