import { AutoReplyConfig, TriggerPeriod, TriggerRate, TriggerType } from '@prisma/client';
import jsonLogic from 'json-logic-js';
import { nanoid } from 'nanoid';
import Schedule, { scheduleJob } from 'node-schedule';
import { Service } from 'typedi';
import { NotfoundError } from '../../common/errors';
import logger from '../../common/logger';
import prisma from '../../common/prisma';
import { BotMessageType } from '../bot/bot.class';
import { BotService } from '../bot/bot.service';

@Service()
export class AutoReplyService {
  constructor(private botService: BotService) {}

  /**
   * 验证机器人
   * @param botId 机器人id
   * @returns
   */
  private validatedBot(botId: string) {
    const bot = this.botService.getBotByLocal(botId);

    if (!bot) throw new NotfoundError('机器人已失效或不存在!');
    if (!bot.isReady) throw new NotfoundError('机器人未准备就绪!');

    return bot;
  }

  /**
   * 创建触发形自执行任务
   * @param config 自执行任务配置
   * @returns
   */
  createKeywordsReply(config: AutoReplyConfig) {
    const bot = this.validatedBot(config.botId);
    bot.on('message', {
      handleId: config.id,
      typeOrTypes: [BotMessageType.Text, BotMessageType.Url],
      handle: async (msg, messageInstance) => {
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

        if (config.triggerRate === TriggerRate.Once) {
          this.removeKeywordsReply(config);
        }
      },
    });
  }

  /**
   * 删除触发形自执行任务
   * @param config 自执行任务配置
   * @returns
   */
  removeKeywordsReply(config: AutoReplyConfig) {
    const bot = this.validatedBot(config.botId);
    bot.off('message', config.id);
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

  /**
   * 创建定时自执行任务名称
   * @param config 自执行任务配置
   * @returns
   */
  private createJobName(config: AutoReplyConfig) {
    return `${config.name}-${config.botId}-${config.id}`;
  }

  /**
   * 创建定时自执行任务
   * @param config 自执行任务配置
   * @returns
   */
  async createCronJob(config: AutoReplyConfig) {
    const bot = this.validatedBot(config.botId);
    const jobName = this.createJobName(config);
    const replayContact = await bot.bot.Contact.find(config.triggerExpr as any); // {name: string | RegExp} / {alias: string | RegExp}

    if (!replayContact) throw new NotfoundError('无法获取执行自动任务的对象!');
    if (!config.triggerPeriod) throw new NotfoundError('无法获取执行自动任务的触发周期!');

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
            },
          });
        } catch (error) {
          logger.error(`[cron-job-${config.id}]: ${error}`);
          // ? 发生错误终止任务
          this.removeCronJob(config);
        }

        if (config.triggerRate === TriggerRate.Once) {
          this.removeCronJob(config);
        }
      }
    );
  }

  /**
   * 删除定时自执行任务
   * @param config 自执行任务配置
   * @returns
   */
  removeCronJob(config: AutoReplyConfig) {
    const jobName = this.createJobName(config);
    Schedule.cancelJob(jobName);
  }

  async createJob(config: AutoReplyConfig) {
    // 定时任务
    if (config.triggerType === TriggerType.Auto) {
      this.removeCronJob(config);
      await this.createCronJob(config);
    }
    // 自动回复
    if (config.triggerType === TriggerType.Event) {
      this.removeKeywordsReply(config);
      this.createKeywordsReply(config);
    }
    return true;
  }
}
